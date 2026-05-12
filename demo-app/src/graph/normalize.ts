import type { MarketState } from '@functionspace/core';
import type { NormalizedMarket } from './types.js';

export const CURATED_MARKET_IDS = new Set([
  208, 205, 207, 213, 7,      // Cluster 0 — AI Arms Race
  243, 139, 148, 150, 149,    // Cluster 1 — Capital Stack
  189, 190,   5, 242, 164,    // Cluster 2 — New Frontier
]);

// Per-market cluster assignment bypasses scope-based inference.
// 0 = AI Arms Race  |  1 = Capital Stack  |  2 = New Frontier
export const MARKET_CLUSTER: Record<number, number> = {
  208: 0, 205: 0, 207: 0, 213: 0,   7: 0,
  243: 1, 139: 1, 148: 1, 150: 1, 149: 1,
  189: 2, 190: 2,   5: 2, 242: 2, 164: 2,
};


const SCOPE_OVERRIDES: Record<string, string> = {
  'Crypto & DeFi': 'Cryptocurrency & Web3',
};

function normalizeScope(raw: string): string {
  if (SCOPE_OVERRIDES[raw]) return SCOPE_OVERRIDES[raw];
  if (/^Cryptocurrency & Web\d+$/.test(raw)) return 'Cryptocurrency & Web3';
  return raw;
}

function extractCategories(metadata: Record<string, unknown>): string[] {
  const cats = metadata.categories;
  if (Array.isArray(cats)) return cats.map(String);
  if (typeof cats === 'string' && cats) return [cats];
  return [];
}

export function normalizeMarket(m: MarketState): NormalizedMarket | null {
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const categories = extractCategories(meta);
  const scope = typeof meta.scope === 'string' ? normalizeScope(meta.scope) : '';
  const subjectNoun = typeof meta.subject_noun === 'string' ? meta.subject_noun : '';
  const resolvesAt = typeof meta.resolves_at === 'string' ? meta.resolves_at : null;
  if (!scope || categories.length === 0) return null;
  return { marketId: m.marketId, title: m.title, categories, scope, subjectNoun, resolvesAt };
}

export function selectMarkets(markets: MarketState[]): NormalizedMarket[] {
  const selected: NormalizedMarket[] = [];
  for (const m of markets) {
    if (!CURATED_MARKET_IDS.has(m.marketId)) continue;
    const n = normalizeMarket(m);
    if (n) selected.push(n);
  }
  return selected;
}
