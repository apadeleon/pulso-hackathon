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
