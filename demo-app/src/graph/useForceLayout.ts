import { useState, useEffect, useCallback, useRef } from 'react';
import type { GraphData } from './types';

const DEFAULT_CANVAS_W = 1000;
const DEFAULT_CANVAS_H = 680;

// Cluster seed centroids — same values as CLUSTER_REGIONS in GraphSVG
const DEFAULT_CLUSTER_SEEDS: Record<number, { x: number; y: number }> = {
  0: { x: 380, y: 290 },
  1: { x: 780, y: 230 },
  2: { x: 800, y: 540 },
  3: { x: 180, y: 560 },
};

type Pos = { x: number; y: number };

export interface UseForceLayoutResult {
  stablePos: Map<string, Pos>;
  setOverride: (id: string, pos: Pos | null) => void;
}

/**
 * Fruchterman-Reingold force-directed layout with cluster gravity.
 * Accepts optional initialPositions (e.g. hand-placed NODE_POSITIONS) so the
 * simulation starts from a known-good state and converges quickly.
 */
export function useForceLayout(
  graphData: GraphData | null,
  initialPositions?: Record<string, Pos>,
  canvasW: number = DEFAULT_CANVAS_W,
  canvasH: number = DEFAULT_CANVAS_H,
  clusterSeeds: Record<number, Pos> = DEFAULT_CLUSTER_SEEDS,
): UseForceLayoutResult {
  const [stablePos, setStablePos] = useState<Map<string, Pos>>(new Map());
  const overridesRef = useRef<Map<string, Pos>>(new Map());

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;

    const nodes = graphData.nodes;
    const positions = new Map<string, Pos>();

    // Seed positions: use initialPositions if given, else cluster-based radial spread
    if (initialPositions) {
      nodes.forEach(n => {
        const seed = initialPositions[n.id];
        positions.set(n.id, seed ? { ...seed } : { x: canvasW / 2, y: canvasH / 2 });
      });
    } else {
      const clusterCount = new Map<number, number>();
      const clusterSizes = new Map<number, number>();
      nodes.forEach(n => clusterSizes.set(n.group, (clusterSizes.get(n.group) ?? 0) + 1));
      nodes.forEach(n => {
        const count = clusterCount.get(n.group) ?? 0;
        const total = clusterSizes.get(n.group) ?? 1;
        const seed = clusterSeeds[n.group] ?? { x: canvasW / 2, y: canvasH / 2 };
        const angle = (count / total) * Math.PI * 2 + n.group * 0.9;
        positions.set(n.id, {
          x: seed.x + Math.cos(angle) * 75,
          y: seed.y + Math.sin(angle) * 55,
        });
        clusterCount.set(n.group, count + 1);
      });
    }

    // Apply any active drag overrides as fixed anchors
    overridesRef.current.forEach((pos, id) => positions.set(id, { ...pos }));

    // ── Fruchterman-Reingold ──────────────────────────────────────────────
    const k = Math.sqrt((canvasW * canvasH) / nodes.length) * 0.85;
    const ITERATIONS = 180;
    let temp = canvasW * 0.12;
    const cooling = (temp - 0.5) / ITERATIONS;
    const disp = new Map<string, Pos>();
    nodes.forEach(n => disp.set(n.id, { x: 0, y: 0 }));

    const strengthMul: Record<string, number> = { strong: 1.6, medium: 1.0, weak: 0.6 };

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Reset displacements
      nodes.forEach(n => { const d = disp.get(n.id)!; d.x = 0; d.y = 0; });

      // Repulsive forces (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pu = positions.get(nodes[i].id)!;
          const pv = positions.get(nodes[j].id)!;
          const dx = pu.x - pv.x, dy = pu.y - pv.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = (k * k) / dist;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          const du = disp.get(nodes[i].id)!; du.x += fx; du.y += fy;
          const dv = disp.get(nodes[j].id)!; dv.x -= fx; dv.y -= fy;
        }
      }

      // Attractive forces (edges)
      for (const e of graphData.edges) {
        const pu = positions.get(e.source), pv = positions.get(e.target);
        if (!pu || !pv) continue;
        const dx = pu.x - pv.x, dy = pu.y - pv.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist * dist) / k * (strengthMul[e.strength] ?? 1.0);
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        const du = disp.get(e.source)!; du.x -= fx; du.y -= fy;
        const dv = disp.get(e.target)!; dv.x += fx; dv.y += fy;
      }

      // Cluster gravity — gentle pull toward cluster centroid
      for (const n of nodes) {
        const seed = clusterSeeds[n.group];
        if (!seed) continue;
        const p = positions.get(n.id)!;
        const d = disp.get(n.id)!;
        d.x += (seed.x - p.x) * 0.06;
        d.y += (seed.y - p.y) * 0.06;
      }

      // Apply displacements with temperature clamping
      for (const n of nodes) {
        // Dragged nodes are fixed
        if (overridesRef.current.has(n.id)) {
          positions.set(n.id, overridesRef.current.get(n.id)!);
          continue;
        }
        const d = disp.get(n.id)!;
        const p = positions.get(n.id)!;
        const dlen = Math.max(Math.sqrt(d.x * d.x + d.y * d.y), 0.01);
        const move = Math.min(dlen, temp);
        positions.set(n.id, {
          x: Math.min(Math.max(p.x + (d.x / dlen) * move, 60), canvasW - 60),
          y: Math.min(Math.max(p.y + (d.y / dlen) * move, 60), canvasH - 60),
        });
      }

      temp = Math.max(temp - cooling, 0.5);
    }

    setStablePos(new Map(positions));
  }, [graphData, canvasW, canvasH]); // intentionally omitting initialPositions/clusterSeeds — only used as seed

  const setOverride = useCallback((id: string, pos: Pos | null) => {
    if (pos === null) {
      overridesRef.current.delete(id);
    } else {
      overridesRef.current.set(id, pos);
      setStablePos(prev => {
        const next = new Map(prev);
        next.set(id, pos);
        return next;
      });
    }
  }, []);

  return { stablePos, setOverride };
}
