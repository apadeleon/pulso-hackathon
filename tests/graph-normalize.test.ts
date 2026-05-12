import { describe, it, expect } from 'vitest';
import {
  selectMarkets,
  MARKET_CLUSTER,
  CURATED_MARKET_IDS,
} from '../demo-app/src/graph/normalize.js';
import type { MarketState } from '@functionspace/core';

function mockMarket(id: number, scope: string, categories: string[] = ['Test']): MarketState {
  return {
    marketId: id,
    title: `Market ${id}`,
    metadata: { scope, categories, subject_noun: 'subject' },
  } as unknown as MarketState;
}

describe('CURATED_MARKET_IDS', () => {
  it('contains exactly 15 market IDs', () => {
    expect(CURATED_MARKET_IDS.size).toBe(15);
  });

  it('includes all World Cup Core IDs', () => {
    for (const id of [129, 248, 249, 247, 246, 245, 244, 92]) {
      expect(CURATED_MARKET_IDS.has(id)).toBe(true);
    }
  });

  it('includes all Legacy / Star Power IDs', () => {
    for (const id of [93, 34]) {
      expect(CURATED_MARKET_IDS.has(id)).toBe(true);
    }
  });

  it('includes all Attention / Creator Economy IDs', () => {
    for (const id of [222, 225, 231, 227]) {
      expect(CURATED_MARKET_IDS.has(id)).toBe(true);
    }
  });

  it('includes the Travel Spillover ID', () => {
    expect(CURATED_MARKET_IDS.has(73)).toBe(true);
  });
});

describe('MARKET_CLUSTER', () => {
  it('assigns cluster 0 to all World Cup Core markets', () => {
    for (const id of [129, 248, 249, 247, 246, 245, 244, 92]) {
      expect(MARKET_CLUSTER[id]).toBe(0);
    }
  });

  it('assigns cluster 1 to all Legacy / Star Power markets', () => {
    for (const id of [93, 34]) {
      expect(MARKET_CLUSTER[id]).toBe(1);
    }
  });

  it('assigns cluster 2 to all Attention / Creator Economy markets', () => {
    for (const id of [222, 225, 231, 227]) {
      expect(MARKET_CLUSTER[id]).toBe(2);
    }
  });

  it('assigns cluster 3 to the Travel Spillover market', () => {
    expect(MARKET_CLUSTER[73]).toBe(3);
  });
});

describe('selectMarkets', () => {
  it('returns only whitelisted markets', () => {
    const markets = [
      mockMarket(129, 'Sports', ['Football']),
      mockMarket(999, 'Sports', ['Football']),  // not in whitelist
      mockMarket(73,  'Travel', ['Tourism']),
    ];
    const result = selectMarkets(markets);
    const ids = result.map(m => m.marketId);
    expect(ids).toContain(129);
    expect(ids).toContain(73);
    expect(ids).not.toContain(999);
  });

  it('skips markets with no scope', () => {
    const markets = [
      mockMarket(129, '', ['Football']),
    ];
    expect(selectMarkets(markets)).toHaveLength(0);
  });

  it('skips markets with no categories', () => {
    const markets = [
      { marketId: 129, title: 'Test', metadata: { scope: 'Sports', categories: [] } } as unknown as MarketState,
    ];
    expect(selectMarkets(markets)).toHaveLength(0);
  });
});
