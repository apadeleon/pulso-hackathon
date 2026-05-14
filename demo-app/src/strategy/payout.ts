import type { PayoutCurve } from '@functionspace/core';

export interface CombinedPayout {
  totalCommitted: number;
  /** Sum of each leg's maxPayout — best case when every leg is correct. */
  bestCase: number;
  /** Sum of each leg's minimum payout — worst case when every leg is wrong. */
  worstCase: number;
}

export function computeCombinedPayout(curves: PayoutCurve[]): CombinedPayout {
  if (curves.length === 0) {
    return { totalCommitted: 0, bestCase: 0, worstCase: 0 };
  }
  return {
    totalCommitted: curves.reduce((s, c) => s + c.inputCollateral, 0),
    bestCase:       curves.reduce((s, c) => s + c.maxPayout, 0),
    worstCase:      curves.reduce((s, c) => s + Math.min(...c.previews.map(p => p.payout)), 0),
  };
}
