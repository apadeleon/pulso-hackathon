import { describe, it, expect } from 'vitest';
import { computeDirectionBelief } from '../demo-app/src/strategy/belief.ts';
import { computeCombinedPayout } from '../demo-app/src/strategy/payout.ts';
import type { MarketState, PayoutCurve } from '@functionspace/core';

function mockMarket(consensusMean: number, lower: number, upper: number, buckets: number): MarketState {
  return {
    marketId: 1,
    title: 'Test market',
    config: { numBuckets: buckets, lowerBound: lower, upperBound: upper, P0: 1, mu: 1, epsAlpha: 0, tau: 0, gamma: 1, lambdaS: 1, lambdaD: 1 },
    consensusMean,
    consensus: new Array(buckets + 2).fill(1),
    alpha: [],
    totalMass: 1,
    poolBalance: 1000,
    participantCount: 5,
    totalVolume: 500,
    positionsOpen: 3,
    xAxisUnits: 'goals',
    decimals: 1,
    resolutionState: 'open',
    resolvedOutcome: null,
    createdAt: null,
    expiresAt: null,
    resolvedAt: null,
    marketType: 'standard',
    marketSubtype: null,
    metadata: {},
  } as MarketState;
}

describe('computeDirectionBelief', () => {
  const market = mockMarket(42, 0, 100, 10);

  it('returns a vector of length numBuckets + 2', () => {
    expect(computeDirectionBelief(market, 'higher')).toHaveLength(12);
  });

  it('higher belief has no negative values', () => {
    const belief = computeDirectionBelief(market, 'higher');
    expect(belief.every(v => v >= 0)).toBe(true);
  });

  it('higher belief mass skews right of consensusMean', () => {
    const { numBuckets, lowerBound, upperBound } = market.config;
    const belief = computeDirectionBelief(market, 'higher');
    const bucketWidth = (upperBound - lowerBound) / numBuckets;
    const meanIdx = Math.floor((market.consensusMean - lowerBound) / bucketWidth) + 1;
    const leftMass = belief.slice(1, meanIdx + 1).reduce((a, b) => a + b, 0);
    const rightMass = belief.slice(meanIdx + 1, numBuckets + 1).reduce((a, b) => a + b, 0);
    expect(rightMass).toBeGreaterThan(leftMass);
  });

  it('lower belief mass skews left of consensusMean', () => {
    const { numBuckets, lowerBound, upperBound } = market.config;
    const belief = computeDirectionBelief(market, 'lower');
    const bucketWidth = (upperBound - lowerBound) / numBuckets;
    const meanIdx = Math.floor((market.consensusMean - lowerBound) / bucketWidth) + 1;
    const leftMass = belief.slice(1, meanIdx + 1).reduce((a, b) => a + b, 0);
    const rightMass = belief.slice(meanIdx + 1, numBuckets + 1).reduce((a, b) => a + b, 0);
    expect(leftMass).toBeGreaterThan(rightMass);
  });

  it('does not throw when consensusMean equals lowerBound', () => {
    const edge = mockMarket(0, 0, 100, 10);
    expect(() => computeDirectionBelief(edge, 'lower')).not.toThrow();
  });

  it('does not throw when consensusMean equals upperBound', () => {
    const edge = mockMarket(100, 0, 100, 10);
    expect(() => computeDirectionBelief(edge, 'higher')).not.toThrow();
  });
});

describe('computeCombinedPayout', () => {
  it('returns zeros for empty array', () => {
    expect(computeCombinedPayout([])).toEqual({ totalCommitted: 0, bestCase: 0, worstCase: 0 });
  });

  it('sums inputCollateral for totalCommitted', () => {
    const curves: PayoutCurve[] = [
      { previews: [{ outcome: 10, payout: 5, profitLoss: -5 }], maxPayout: 5, maxPayoutOutcome: 10, inputCollateral: 10 },
      { previews: [{ outcome: 10, payout: 8, profitLoss: -2 }], maxPayout: 8, maxPayoutOutcome: 10, inputCollateral: 20 },
    ];
    expect(computeCombinedPayout(curves).totalCommitted).toBe(30);
  });

  it('sums maxPayouts for bestCase', () => {
    const curves: PayoutCurve[] = [
      { previews: [{ outcome: 10, payout: 30, profitLoss: 20 }, { outcome: 5, payout: 5, profitLoss: -5 }], maxPayout: 30, maxPayoutOutcome: 10, inputCollateral: 10 },
      { previews: [{ outcome: 10, payout: 25, profitLoss: 15 }, { outcome: 5, payout: 8, profitLoss: -2 }], maxPayout: 25, maxPayoutOutcome: 10, inputCollateral: 10 },
    ];
    expect(computeCombinedPayout(curves).bestCase).toBe(55);
  });

  it('worstCase = Σ min(previews.payout) per leg', () => {
    const curves: PayoutCurve[] = [
      { previews: [{ outcome: 10, payout: 30, profitLoss: 20 }, { outcome: 5, payout: 5, profitLoss: -5 }], maxPayout: 30, maxPayoutOutcome: 10, inputCollateral: 10 },
      { previews: [{ outcome: 10, payout: 25, profitLoss: 15 }, { outcome: 5, payout: 8, profitLoss: -2 }], maxPayout: 25, maxPayoutOutcome: 10, inputCollateral: 10 },
    ];
    expect(computeCombinedPayout(curves).worstCase).toBe(13);
  });
});

import { preflight } from '../demo-app/src/strategy/preflight.ts';
import { classifyExecutionError } from '../demo-app/src/strategy/errors.ts';
import type { StrategyLeg } from '../demo-app/src/strategy/StrategyContext.tsx';

function makeLeg(overrides: Partial<StrategyLeg> = {}): StrategyLeg {
  return {
    nodeId: '129',
    marketId: 1,
    title: 'Test Leg',
    direction: 'higher',
    collateral: 10,
    belief: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05],
    payoutPreview: null,
    ...overrides,
  };
}

describe('preflight', () => {
  it('reports not_authenticated when not logged in', () => {
    const r = preflight([makeLeg()], false, 1000);
    expect(r.canExecute).toBe(false);
    expect(r.blockers.find(b => b.kind === 'not_authenticated')).toBeDefined();
  });

  it('reports no_legs when cart is empty', () => {
    const r = preflight([], true, 1000);
    expect(r.canExecute).toBe(false);
    expect(r.blockers.find(b => b.kind === 'no_legs')).toBeDefined();
  });

  it('reports incomplete_leg when direction is missing', () => {
    const r = preflight([makeLeg({ direction: null, belief: null })], true, 1000);
    expect(r.canExecute).toBe(false);
    expect(r.blockers.find(b => b.kind === 'incomplete_leg')).toBeDefined();
  });

  it('reports incomplete_leg when belief has not been computed yet', () => {
    const r = preflight([makeLeg({ belief: null })], true, 1000);
    expect(r.canExecute).toBe(false);
    expect(r.blockers.find(b => b.kind === 'incomplete_leg')).toBeDefined();
  });

  it('reports invalid_collateral when bet amount is zero', () => {
    const r = preflight([makeLeg({ collateral: 0 })], true, 1000);
    expect(r.canExecute).toBe(false);
    expect(r.blockers.find(b => b.kind === 'invalid_collateral')).toBeDefined();
  });

  it('reports insufficient_funds when total > walletValue', () => {
    const legs = [makeLeg({ collateral: 30 }), makeLeg({ marketId: 2, collateral: 30 })];
    const r = preflight(legs, true, 45);
    expect(r.canExecute).toBe(false);
    const insuf = r.blockers.find(b => b.kind === 'insufficient_funds');
    expect(insuf).toBeDefined();
    expect(insuf?.shortfall).toBe(15);
  });

  it('does NOT flag insufficient_funds when walletValue is null (unknown)', () => {
    const r = preflight([makeLeg({ collateral: 30 })], true, null);
    expect(r.blockers.find(b => b.kind === 'insufficient_funds')).toBeUndefined();
  });

  it('canExecute=true when everything is ready and funded', () => {
    const r = preflight([makeLeg({ collateral: 10 })], true, 100);
    expect(r.canExecute).toBe(true);
    expect(r.totalCollateral).toBe(10);
  });
});

describe('classifyExecutionError', () => {
  it('detects insufficient_funds', () => {
    expect(classifyExecutionError(new Error('API error: Insufficient balance')).kind).toBe('insufficient_funds');
    expect(classifyExecutionError(new Error('not enough funds')).kind).toBe('insufficient_funds');
  });

  it('detects not_authenticated', () => {
    expect(classifyExecutionError(new Error('Authentication required. Please sign in to perform this action.')).kind).toBe('not_authenticated');
    expect(classifyExecutionError(new Error('Unauthorized')).kind).toBe('not_authenticated');
  });

  it('detects market_closed', () => {
    expect(classifyExecutionError(new Error('API error: market is closed')).kind).toBe('market_closed');
    expect(classifyExecutionError(new Error('Market already resolved')).kind).toBe('market_closed');
  });

  it('falls back to unknown for unrecognised messages', () => {
    expect(classifyExecutionError(new Error('Some other thing')).kind).toBe('unknown');
  });

  it('handles non-Error throwables', () => {
    expect(classifyExecutionError('string thrown').kind).toBe('unknown');
    expect(classifyExecutionError(42).kind).toBe('unknown');
  });
});
