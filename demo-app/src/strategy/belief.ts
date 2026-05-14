import { generateGaussian } from '@functionspace/core';
import type { MarketState, BeliefVector } from '@functionspace/core';

export type Direction = 'higher' | 'lower';

export function computeDirectionBelief(market: MarketState, direction: Direction): BeliefVector {
  const { numBuckets, lowerBound, upperBound } = market.config;
  const mean = market.consensusMean;
  const spread = (upperBound - lowerBound) / 6;

  // Clamp center 5% inside bounds to avoid degenerate beliefs at the boundary
  const minCenter = lowerBound + (upperBound - lowerBound) * 0.05;
  const maxCenter = upperBound - (upperBound - lowerBound) * 0.05;

  const rawCenter = direction === 'higher'
    ? mean + (upperBound - mean) * 0.4
    : mean - (mean - lowerBound) * 0.4;

  const center = Math.min(Math.max(rawCenter, minCenter), maxCenter);
  return generateGaussian(center, spread, numBuckets, lowerBound, upperBound);
}
