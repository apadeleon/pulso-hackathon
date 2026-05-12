import { useMemo } from 'react';
import { useMarkets } from '@functionspace/react';
import { selectMarkets, MARKET_CLUSTER } from './normalize.js';
import { buildEdges } from './heuristics.js';
import type { GraphData, GraphNode } from './types.js';

export interface UseGraphDataResult {
  graphData: GraphData | null;
  loading: boolean;
  error: Error | null;
}

export function useGraphData(): UseGraphDataResult {
  const { markets, loading, error } = useMarkets({ state: 'open' });

  const graphData = useMemo<GraphData | null>(() => {
    if (!markets || markets.length === 0) return null;

    const selected = selectMarkets(markets);

    const nodes: GraphNode[] = selected.map(m => {
      const cluster = MARKET_CLUSTER[m.marketId] ?? 0;
      return {
        id: String(m.marketId),
        marketId: m.marketId,
        title: m.title,
        categories: m.categories,
        scope: m.scope,
        subjectNoun: m.subjectNoun,
        resolvesAt: m.resolvesAt,
        group: cluster,
        cluster,
        degree: 0,
      };
    });

    const edges = buildEdges(nodes);

    // Compute and attach degree to each node
    const degreeMap = new Map<string, number>();
    for (const e of edges) {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    }
    const nodesWithDegree = nodes.map(n => ({
      ...n,
      degree: degreeMap.get(n.id) ?? 0,
    }));

    return { nodes: nodesWithDegree, edges };
  }, [markets]);

  return { graphData, loading, error };
}
