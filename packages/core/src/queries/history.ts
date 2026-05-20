import type { FSClient } from '../client.js';
import type { MarketHistory } from '../types.js';

/**
 * Returns market history (snapshots of alpha vectors over time).
 * Wraps: GET /api/views/history/{market_id}?limit=N&offset=M
 */
export async function queryMarketHistory(
  client: FSClient,
  marketId: string | number,
  limit?: number,
  offset?: number,
  options?: { signal?: AbortSignal },
): Promise<MarketHistory> {
  const params: Record<string, string> = {};
  if (limit !== undefined) params.limit = String(limit);
  if (offset !== undefined) params.offset = String(offset);

  const data = await client.get<any>(`/api/views/history/${marketId}`, params, options?.signal);

  return {
    marketId: data.market_id,
    totalSnapshots: data.total_snapshots,
    snapshots: (data.snapshots ?? []).map((s: any) => ({
      snapshotId: s.snapshot_id,
      tradeId: s.trade_id,
      side: s.side,
      positionId: String(s.position_id),
      alphaVector: s.alpha_vector ?? s.state_vector,
      totalDeposits: s.total_deposited,
      totalWithdrawals: s.total_withdrawn,
      totalVolume: s.total_volume,
      currentPool: s.current_pool,
      numOpenPositions: s.num_open_positions,
      createdAt: s.created_at,
    })),
  };
}
