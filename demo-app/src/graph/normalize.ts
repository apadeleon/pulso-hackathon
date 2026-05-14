import type { MarketState } from '@functionspace/core';
import type { NormalizedMarket } from './types.js';

export const CURATED_MARKET_IDS = new Set([
  129, 248, 249, 247, 246, 245, 244, 92,  // Cluster 0 — World Cup Core
  93, 34,                                  // Cluster 1 — Legacy / Star Power
  222, 225, 231, 227,                      // Cluster 2 — Attention / Creator Economy
  73,                                      // Cluster 3 — Travel Spillover
]);

// Per-market cluster assignment bypasses scope-based inference.
// 0 = World Cup Core  |  1 = Legacy / Star Power  |  2 = Attention / Creator Economy  |  3 = Travel Spillover
export const MARKET_CLUSTER: Record<number, number> = {
  129: 0, 248: 0, 249: 0, 247: 0, 246: 0, 245: 0, 244: 0, 92: 0,
  93: 1, 34: 1,
  222: 2, 225: 2, 231: 2, 227: 2,
  73: 3,
};


// English title overrides for all curated markets (API returns Spanish titles)
export function getEnglishTitle(marketId: number, fallback = ''): string {
  return TITLE_EN[marketId] ?? fallback;
}

const TITLE_EN: Record<number, string> = {
  129: '2026 FIFA World Cup Peak Viewership Record',
  248: 'Average Attendance at Mexico-Hosted 2026 World Cup Matches',
  249: 'Total VAR Overturns in 2026 FIFA World Cup',
  247: 'CONCACAF Teams Reaching 2026 World Cup Round of 16',
  246: 'CONMEBOL Teams Reaching 2026 World Cup Quarterfinals',
  245: 'U21 Player Minutes in 2026 World Cup Knockout Stage',
  244: 'Goals by Players Aged 35+ in 2026 World Cup',
  92:  'Total Cards in 2026 FIFA World Cup',
  93:  'Messi Goals at 2026 FIFA World Cup',
  34:  'Ronaldo at 2026 FIFA World Cup',
  222: 'Twitch Peak Concurrent Viewers 2026',
  225: 'Kai Cenat Peak Concurrent Viewers 2026',
  231: 'Kick Peak Concurrent Viewers 2026',
  227: 'Instagram Reels Viral Milestones — World Cup 2026',
  73:  'Mexico Flight Demand — World Cup 2026',
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
  const title = TITLE_EN[m.marketId] ?? m.title;
  return { marketId: m.marketId, title, categories, scope, subjectNoun, resolvesAt };
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
