import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GraphData, GraphNode, GraphEdge } from './graph/types';
import { clusterColor } from './graph/theme';

interface Props {
  centerNodeId: string;
  graphData: GraphData;
  height?: number;
}

interface SubNode extends GraphNode {
  x: number;
  y: number;
}

interface SubEdge extends GraphEdge {
  srcNode: SubNode;
  tgtNode: SubNode;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function MiniSubgraph({ centerNodeId, graphData, height = 260 }: Props) {
  const navigate = useNavigate();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeIdx, setHoveredEdgeIdx] = useState<number | null>(null);

  const { subNodes, subEdges } = useMemo(() => {
    const center = graphData.nodes.find(n => n.id === centerNodeId);
    if (!center) return { subNodes: [], subEdges: [] };

    const neighborEdges = graphData.edges
      .filter(e =>
        (e.source === centerNodeId || e.target === centerNodeId) &&
        (e.strength === 'strong' || e.strength === 'medium'),
      )
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    const neighborIds = new Set(
      neighborEdges.map(e => e.source === centerNodeId ? e.target : e.source),
    );

    const neighbors = graphData.nodes.filter(n => neighborIds.has(n.id));
    return { subNodes: [center, ...neighbors], subEdges: neighborEdges };
  }, [graphData, centerNodeId]);

  // Compute radial layout: center in middle, neighbors arranged in a circle
  const W = 340;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.34;

  const layoutNodes: SubNode[] = useMemo(() => {
    if (subNodes.length === 0) return [];
    const [center, ...neighbors] = subNodes;
    const angleStep = (2 * Math.PI) / Math.max(neighbors.length, 1);
    const startAngle = -Math.PI / 2;

    const positioned: SubNode[] = [{ ...center, x: cx, y: cy }];
    neighbors.forEach((n, i) => {
      const angle = startAngle + i * angleStep;
      positioned.push({
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });
    return positioned;
  }, [subNodes, cx, cy, radius]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, SubNode>();
    layoutNodes.forEach(n => m.set(n.id, n));
    return m;
  }, [layoutNodes]);

  const layoutEdges: SubEdge[] = useMemo(() => {
    return subEdges.flatMap(e => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      if (!src || !tgt) return [];
      return [{ ...e, srcNode: src, tgtNode: tgt }];
    });
  }, [subEdges, nodeMap]);

  const handleNodeClick = useCallback((id: string) => {
    if (id === centerNodeId) return;
    navigate(`/market/${id}`);
  }, [navigate, centerNodeId]);

  if (layoutNodes.length < 2) return null;

  const activeEdge = hoveredEdgeIdx !== null ? layoutEdges[hoveredEdgeIdx] : null;

  return (
    <div className="pg-mini-subgraph">
      <div className="pg-mini-subgraph__canvas" style={{ position: 'relative' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Edges */}
          {layoutEdges.map((e, i) => {
            const isHoveredEdge = hoveredEdgeIdx === i;
            const isConnectedToHoveredNode =
              hoveredNodeId !== null &&
              (e.source === hoveredNodeId || e.target === hoveredNodeId);
            const isActive = isHoveredEdge || isConnectedToHoveredNode;
            const isDimmed = (hoveredNodeId !== null || hoveredEdgeIdx !== null) && !isActive;

            const mx = (e.srcNode.x + e.tgtNode.x) / 2;
            const my = (e.srcNode.y + e.tgtNode.y) / 2;

            return (
              <g key={i}>
                {/* Invisible wide hit area */}
                <line
                  x1={e.srcNode.x} y1={e.srcNode.y}
                  x2={e.tgtNode.x} y2={e.tgtNode.y}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => { setHoveredEdgeIdx(i); setHoveredNodeId(null); }}
                  onMouseLeave={() => setHoveredEdgeIdx(null)}
                />
                {/* Visible edge */}
                <line
                  x1={e.srcNode.x} y1={e.srcNode.y}
                  x2={e.tgtNode.x} y2={e.tgtNode.y}
                  stroke={
                    isActive
                      ? 'rgba(255,255,255,0.90)'
                      : isDimmed
                      ? 'rgba(255,255,255,0.06)'
                      : e.strength === 'strong'
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.30)'
                  }
                  strokeWidth={isActive ? 2.2 : e.strength === 'strong' ? 1.8 : 1.1}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Edge reason label on hover */}
                {isActive && e.reason && (
                  <text
                    x={mx}
                    y={my - 5}
                    textAnchor="middle"
                    fill="rgba(226,232,240,0.92)"
                    fontSize={9}
                    fontWeight={500}
                    fontFamily="-apple-system, 'Segoe UI', sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    <tspan
                      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
                    >
                      {truncate(e.reason, 28)}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map(n => {
            const isCenter = n.id === centerNodeId;
            const color = clusterColor(n.group ?? 0);
            const isHovered = hoveredNodeId === n.id;
            const isNeighborOfHovered = hoveredNodeId !== null && !isHovered && !isCenter &&
              layoutEdges.some(e =>
                (e.source === hoveredNodeId && e.target === n.id) ||
                (e.target === hoveredNodeId && e.source === n.id),
              );
            const hasAnyHover = hoveredNodeId !== null || hoveredEdgeIdx !== null;
            const isDimmed = hasAnyHover && !isHovered && !isCenter && !isNeighborOfHovered;

            const R = isCenter ? 12 : 7;
            const opacity = isDimmed ? 0.12 : isHovered ? 1.0 : isCenter ? 1.0 : 0.80;

            return (
              <g
                key={n.id}
                style={{ cursor: isCenter ? 'default' : 'pointer' }}
                onMouseEnter={() => { setHoveredNodeId(n.id); setHoveredEdgeIdx(null); }}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => handleNodeClick(n.id)}
              >
                {/* Glow */}
                {!isDimmed && (
                  <circle
                    cx={n.x} cy={n.y}
                    r={R + (isCenter ? 14 : isHovered ? 10 : 7)}
                    fill={color}
                    opacity={isCenter ? 0.18 : isHovered ? 0.22 : 0.10}
                  />
                )}
                {/* Ring on focus/hover */}
                {(isCenter || isHovered) && (
                  <circle
                    cx={n.x} cy={n.y} r={R + 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    opacity={0.85}
                  />
                )}
                {/* Core */}
                <circle cx={n.x} cy={n.y} r={R} fill={color} opacity={opacity} />
                {/* Keystone inner dot */}
                {isCenter && (
                  <circle cx={n.x} cy={n.y} r={4} fill="rgba(8,11,18,0.7)" />
                )}
                {/* Label */}
                {!isDimmed && (
                  <text
                    x={n.x}
                    y={n.y + R + 10}
                    textAnchor="middle"
                    fill={`rgba(226,232,240,${isCenter || isHovered ? 0.97 : 0.65})`}
                    fontSize={isCenter ? 9.5 : 8}
                    fontWeight={isCenter || isHovered ? 700 : 500}
                    fontFamily="Poppins, -apple-system, sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {truncate(n.title ?? '', isCenter ? 20 : 16)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Edge tooltip */}
        {activeEdge && activeEdge.reason && (
          <div className="pg-mini-subgraph__edge-tip">
            <p className="pg-mini-subgraph__edge-reason">"{activeEdge.reason}"</p>
            <div className="pg-mini-subgraph__edge-markets">
              <span style={{ color: clusterColor(activeEdge.srcNode.group ?? 0) }}>
                {truncate(activeEdge.srcNode.title, 22)}
              </span>
              <span className="pg-mini-subgraph__edge-arrow">↔</span>
              <span style={{ color: clusterColor(activeEdge.tgtNode.group ?? 0) }}>
                {truncate(activeEdge.tgtNode.title, 22)}
              </span>
            </div>
          </div>
        )}
      </div>
      <p className="pg-mini-subgraph__hint">Hover edges to see why markets connect · Click a node to explore</p>
    </div>
  );
}
