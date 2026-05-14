import type { MarketState, PayoutCurve } from '@functionspace/core';
import type { Direction } from './belief';

/**
 * Compute a payout estimate locally using the market's current consensus
 * distribution. Used instead of the preview API so the strategy UI always
 * shows numbers — no backend round-trip required.
 *
 * Logic: the consensus vector tells us what probability the crowd assigns to
 * each outcome. If you bet $X on "higher" and the crowd says 30 % of mass
 * is above the mean, the fair odds are ~$X / 0.30. We clamp to [5 %, 95 %]
 * so extreme markets don't produce absurd multipliers.
 */
export function estimateLocalPayout(
  market: MarketState,
  direction: Direction,
  collateral: number,
): PayoutCurve {
  const { numBuckets, lowerBound, upperBound } = market.config;
  const consensus = market.consensus;

  const totalMass = consensus.reduce((a, b) => a + b, 0);

  let winningMass = 0;

  if (totalMass > 0) {
    const bucketWidth = (upperBound - lowerBound) / numBuckets;
    const meanBucketIdx = Math.min(
      numBuckets,
      Math.max(1, Math.floor((market.consensusMean - lowerBound) / bucketWidth) + 1),
    );

    if (direction === 'higher') {
      // Buckets strictly above the mean bucket + upper tail
      for (let i = meanBucketIdx + 1; i <= numBuckets + 1; i++) {
        winningMass += consensus[i] ?? 0;
      }
    } else {
      // Buckets strictly below the mean bucket + lower tail
      for (let i = 0; i < meanBucketIdx; i++) {
        winningMass += consensus[i] ?? 0;
      }
    }
  }

  const winProbability = totalMass > 0
    ? Math.max(0.05, Math.min(0.95, winningMass / totalMass))
    : 0.5;

  const maxPayout = collateral / winProbability;

  const winningOutcome = direction === 'higher'
    ? market.consensusMean + (upperBound - market.consensusMean) * 0.4
    : market.consensusMean - (market.consensusMean - lowerBound) * 0.4;

  const losingOutcome = direction === 'higher' ? lowerBound : upperBound;

  return {
    previews: [
      { outcome: losingOutcome, payout: 0, profitLoss: -collateral },
      { outcome: winningOutcome, payout: maxPayout, profitLoss: maxPayout - collateral },
    ],
    maxPayout,
    maxPayoutOutcome: winningOutcome,
    inputCollateral: collateral,
  };
}
