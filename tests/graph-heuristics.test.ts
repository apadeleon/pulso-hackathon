import { describe, it, expect } from 'vitest';
import { buildEdges } from '../demo-app/src/graph/heuristics.js';
import type { GraphNode } from '../demo-app/src/graph/types.js';

function node(id: string, cluster: number): GraphNode {
  return { id, marketId: Number(id), title: `Market ${id}`, categories: [], scope: '', subjectNoun: '', resolvesAt: null, group: cluster, cluster, degree: 0 };
}

describe('buildEdges — curated strong edges', () => {
  it('returns strong edge from hub (129) to streaming (222)', () => {
    const nodes: GraphNode[] = [node('129', 0), node('222', 2)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].strength).toBe('strong');
    expect(edges[0].source).toBe('129');
    expect(edges[0].target).toBe('222');
  });

  it('returns strong edge from 244 (veteran goals) to 93 (Messi career goals)', () => {
    const nodes: GraphNode[] = [node('244', 0), node('93', 1)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].strength).toBe('strong');
    expect(edges[0].reason).toContain('Messi');
  });

  it('returns strong edge from 222 (Twitch) to 231 (Kick)', () => {
    const nodes: GraphNode[] = [node('222', 2), node('231', 2)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].strength).toBe('strong');
  });
});

describe('buildEdges — curated medium edges', () => {
  it('returns medium edge from 93 (Messi) to 34 (Ronaldo)', () => {
    const nodes: GraphNode[] = [node('93', 1), node('34', 1)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].strength).toBe('medium');
  });

  it('returns medium edge from 129 to 227 (Reels)', () => {
    const nodes: GraphNode[] = [node('129', 0), node('227', 2)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].strength).toBe('medium');
  });
});

describe('buildEdges — missing node filtering', () => {
  it('skips edges when a required node is absent', () => {
    // Only 129 present, not 222 — the strong 129→222 edge should be omitted
    const nodes: GraphNode[] = [node('129', 0)];
    const edges = buildEdges(nodes);
    expect(edges).toHaveLength(0);
  });

  it('returns no edges for an empty node list', () => {
    expect(buildEdges([])).toHaveLength(0);
  });
});

describe('buildEdges — hub connectivity', () => {
  it('hub node 129 has the most connections when all nodes are present', () => {
    const allIds = ['129', '248', '249', '247', '246', '245', '244', '92', '93', '34', '222', '225', '231', '227', '73'];
    const nodes: GraphNode[] = allIds.map((id, i) => node(id, i < 8 ? 0 : i < 10 ? 1 : i < 14 ? 2 : 3));
    const edges = buildEdges(nodes);

    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    const maxDegreeId = [...degree.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(maxDegreeId).toBe('129');
  });
});
