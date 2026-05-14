import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GraphData, GraphNode, GraphEdge } from './graph/types';

// ─── Shared constants from GraphSVG ──────────────────────────────────────────

const DESIGN_COLORS = ['#5468E8', '#E61D25', '#D1D4D1', '#3CAC3B'] as const;

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  '129': { x: 440, y: 300 },
  '249': { x: 280, y: 200 },
  '92':  { x: 215, y: 305 },
  '247': { x: 305, y: 410 },
  '246': { x: 445, y: 425 },
  '248': { x: 200, y: 470 },
  '245': { x: 580, y: 200 },
  '244': { x: 595, y: 320 },
  '93':  { x: 770, y: 280 },
  '34':  { x: 870, y: 175 },
  '227': { x: 690, y: 470 },
  '222': { x: 800, y: 560 },
  '225': { x: 905, y: 480 },
  '231': { x: 905, y: 600 },
  '73':  { x: 220, y: 580 },
};

const NODE_SHORTS: Record<string, string> = {
  '129': 'Final Viewers',
  '249': 'VAR Overturns',
  '92':  'Cards Issued',
  '247': 'CONCACAF in R16',
  '246': 'CONMEBOL in QF',
  '248': 'Mexico Attendance',
  '245': 'U21 Minutes',
  '244': 'Veteran Goals (35+)',
  '93':  'Messi Goals',
  '34':  'Ronaldo at WC26',
  '227': 'Reels Milestones',
  '222': 'Twitch Peak',
  '225': 'Kai Cenat Peak',
  '231': 'Kick Peak',
  '73':  'Mexico Flights',
};

const KEYSTONES = new Set(['129', '93', '73']);

type EdgeKind = 'causal' | 'shared' | 'spillover' | 'amplify';

const EDGE_KINDS: Record<string, EdgeKind> = {
  '129|93': 'amplify',   '93|129': 'amplify',
  '129|247': 'causal',   '247|129': 'causal',
  '129|248': 'causal',   '248|129': 'causal',
  '129|249': 'causal',   '249|129': 'causal',
  '129|92':  'causal',   '92|129':  'causal',
  '129|244': 'amplify',  '244|129': 'amplify',
  '129|246': 'spillover','246|129': 'spillover',
  '129|222': 'spillover','222|129': 'spillover',
  '129|227': 'spillover','227|129': 'spillover',
  '249|92':  'shared',   '92|249':  'shared',
  '249|227': 'spillover','227|249': 'spillover',
  '247|248': 'causal',   '248|247': 'causal',
  '247|73':  'causal',   '73|247':  'causal',
  '248|73':  'shared',   '73|248':  'shared',
  '93|244':  'causal',   '244|93':  'causal',
  '93|34':   'amplify',  '34|93':   'amplify',
  '93|222':  'amplify',  '222|93':  'amplify',
  '93|227':  'amplify',  '227|93':  'amplify',
  '244|245': 'shared',   '245|244': 'shared',
  '246|93':  'shared',   '93|246':  'shared',
  '246|244': 'shared',   '244|246': 'shared',
  '246|73':  'spillover','73|246':  'spillover',
  '222|225': 'shared',   '225|222': 'shared',
  '222|231': 'shared',   '231|222': 'shared',
  '225|231': 'shared',   '231|225': 'shared',
  '227|222': 'spillover','222|227': 'spillover',
};

function getEdgeKind(src: string, tgt: string): EdgeKind {
  return EDGE_KINDS[`${src}|${tgt}`] ?? EDGE_KINDS[`${tgt}|${src}`] ?? 'shared';
}

function nodeRadius(degree: number, isKeystone: boolean): number {
  const base = isKeystone ? 14 : 8;
  return base + Math.min(degree, 6) * 0.9;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  centerNodeId: string;
  graphData: GraphData;
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MiniSubgraph({ centerNodeId, graphData, height = 280 }: Props) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Same drift loop as GraphSVG — ~16 fps
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const loop = (t: number) => {
      if (t - last > 60) { setTick(v => (v + 1) % 100000); last = t; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Nodes to show: center + direct neighbors (strong + medium edges first, up to 6)
  const { visibleNodes, visibleEdges, degree } = useMemo(() => {
    const allEdges = graphData.edges
      .filter(e => e.source === centerNodeId || e.target === centerNodeId)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);

    const neighborIds = new Set(
      allEdges.map(e => e.source === centerNodeId ? e.target : e.source),
    );
    const visibleIds = new Set([centerNodeId, ...neighborIds]);

    const visibleNodes = graphData.nodes.filter(n => visibleIds.has(n.id));
    const degree = new Map<string, number>();
    for (const n of visibleNodes) degree.set(n.id, 0);
    for (const e of allEdges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    return { visibleNodes, visibleEdges: allEdges, degree };
  }, [graphData, centerNodeId]);

  // Animated positions — same sinusoidal drift as GraphSVG
  const positions = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    const t = tick / 18;
    for (const n of visibleNodes) {
      const anchor = NODE_POSITIONS[n.id] ?? { x: 500, y: 340 };
      const seed = Number(n.id) % 100;
      out.set(n.id, {
        x: anchor.x + Math.sin(t * 0.25 + seed * 0.7) * 3.2,
        y: anchor.y + Math.cos(t * 0.2  + seed * 0.5) * 2.6,
      });
    }
    return out;
  }, [visibleNodes, tick]);

  // Compute viewBox that frames all visible nodes with padding
  const viewBox = useMemo(() => {
    const PAD = 90;
    const xs = visibleNodes.map(n => NODE_POSITIONS[n.id]?.x ?? 500);
    const ys = visibleNodes.map(n => NODE_POSITIONS[n.id]?.y ?? 340);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    const maxX = Math.max(...xs) + PAD;
    const maxY = Math.max(...ys) + PAD;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [visibleNodes]);

  // Cluster halos for visible groups
  const clusterHalos = useMemo(() => {
    const groups = new Map<number, string[]>();
    for (const n of visibleNodes) {
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n.id);
    }
    return [...groups.entries()].map(([g, ids]) => {
      const xs = ids.map(id => NODE_POSITIONS[id]?.x ?? 500);
      const ys = ids.map(id => NODE_POSITIONS[id]?.y ?? 340);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rx = Math.max(90, (Math.max(...xs) - Math.min(...xs)) / 2 + 70);
      const ry = Math.max(70, (Math.max(...ys) - Math.min(...ys)) / 2 + 60);
      return { g, cx, cy, rx, ry };
    });
  }, [visibleNodes]);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of visibleEdges) {
      if (!m.has(e.source)) m.set(e.source, new Set());
      if (!m.has(e.target)) m.set(e.target, new Set());
      m.get(e.source)!.add(e.target);
      m.get(e.target)!.add(e.source);
    }
    return m;
  }, [visibleEdges]);

  const handleClick = useCallback((id: string) => {
    if (id !== centerNodeId) navigate(`/market/${id}`);
  }, [centerNodeId, navigate]);

  if (visibleNodes.length < 2) return null;

  const uid = centerNodeId;

  return (
    <div className="pg-mini-subgraph">
      <div className="pg-mini-subgraph__canvas">
        <svg
          width="100%"
          height={height}
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <defs>
            {DESIGN_COLORS.map((color, i) => (
              <radialGradient key={`mg-halo-${uid}-${i}`} id={`mg-halo-${uid}-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
                <stop offset="60%"  stopColor={color} stopOpacity="0.06"/>
                <stop offset="100%" stopColor={color} stopOpacity="0"/>
              </radialGradient>
            ))}
            {DESIGN_COLORS.map((color, i) => (
              <radialGradient key={`mg-glow-${uid}-${i}`} id={`mg-glow-${uid}-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={color} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={color} stopOpacity="0"/>
              </radialGradient>
            ))}
            <marker
              id={`mg-arrow-${uid}`}
              viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(230,236,247,0.85)"/>
            </marker>
          </defs>

          {/* ── Cluster halos ─────────────────────────────────── */}
          {clusterHalos.map(({ g, cx, cy, rx, ry }) => (
            <ellipse
              key={g}
              cx={cx} cy={cy} rx={rx} ry={ry}
              fill={`url(#mg-halo-${uid}-${g})`}
            />
          ))}

          {/* ── Edges ─────────────────────────────────────────── */}
          {visibleEdges.map((e, i) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;

            const kind = getEdgeKind(e.source, e.target);
            const isActive = hoveredId === e.source || hoveredId === e.target;
            const isDimmed = hoveredId !== null && !isActive;

            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const curve = Math.min(len * 0.06, 22);
            const cpx = (a.x + b.x) / 2 + nx * curve;
            const cpy = (a.y + b.y) / 2 + ny * curve;
            const d = `M ${a.x} ${a.y} Q ${cpx} ${cpy} ${b.x} ${b.y}`;

            const sw = isActive
              ? (e.strength === 'strong' ? 2.8 : e.strength === 'medium' ? 2.0 : 1.4)
              : (e.strength === 'strong' ? 1.6 : e.strength === 'medium' ? 1.0 : 0.6);

            const opacity = isDimmed ? 0.07
              : isActive ? 0.95
              : e.strength === 'strong' ? 0.55 : e.strength === 'medium' ? 0.32 : 0.18;

            return (
              <g key={i}>
                <path
                  d={d} fill="none"
                  stroke="rgba(230,236,247,0.92)"
                  strokeWidth={sw}
                  strokeOpacity={opacity}
                  strokeDasharray={kind === 'spillover' ? '5 4' : undefined}
                  strokeLinecap="round"
                  markerEnd={kind === 'causal' ? `url(#mg-arrow-${uid})` : undefined}
                  style={{ transition: 'stroke-width 0.18s, stroke-opacity 0.18s' }}
                />
                {kind === 'amplify' && (
                  <path
                    d={d} fill="none"
                    stroke="rgba(230,236,247,0.92)"
                    strokeWidth={Math.max(sw - 1, 0.5)}
                    strokeOpacity={opacity * 0.55}
                    strokeLinecap="round"
                    transform={`translate(${nx * 3.2}, ${ny * 3.2})`}
                  />
                )}
                {isActive && e.reason && (
                  <text
                    x={cpx} y={cpy - 6}
                    textAnchor="middle"
                    style={{
                      fill: 'rgba(220,230,250,0.80)',
                      fontFamily: "'Noto Sans', -apple-system, sans-serif",
                      fontSize: 9,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    } as React.CSSProperties}
                  >
                    {e.reason.length > 42 ? e.reason.slice(0, 40) + '…' : e.reason}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Nodes ─────────────────────────────────────────── */}
          {visibleNodes.map(n => {
            const p = positions.get(n.id);
            if (!p) return null;

            const isCenter = n.id === centerNodeId;
            const isKeystone = KEYSTONES.has(n.id);
            const deg = degree.get(n.id) ?? 0;
            const r = nodeRadius(deg, isKeystone);
            const color = DESIGN_COLORS[n.group % 4];
            const isHovered = hoveredId === n.id;
            const isNeighbor = !!(hoveredId && adj.get(hoveredId)?.has(n.id));
            const isDimmed = hoveredId !== null && !isHovered && !isCenter && !isNeighbor;
            const short = NODE_SHORTS[n.id] ?? n.title;

            return (
              <g
                key={n.id}
                style={{
                  opacity: isDimmed ? 0.22 : 1,
                  transition: 'opacity 0.25s',
                  cursor: isCenter ? 'default' : 'pointer',
                } as React.CSSProperties}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleClick(n.id)}
              >
                {/* Glow */}
                <circle
                  cx={p.x} cy={p.y}
                  r={r + (isCenter || isHovered ? 18 : isNeighbor ? 10 : 6)}
                  fill={`url(#mg-glow-${uid}-${n.group})`}
                  style={{
                    opacity: isCenter || isHovered ? 1 : isNeighbor ? 0.7 : isKeystone ? 0.6 : 0.35,
                    transition: 'opacity 0.25s',
                    pointerEvents: 'none',
                  }}
                />
                {/* Hover / center ring */}
                {(isCenter || isHovered) && (
                  <circle
                    cx={p.x} cy={p.y} r={r + 5}
                    fill="none" stroke={color}
                    strokeOpacity="0.6" strokeWidth="1.5"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Core */}
                <circle
                  cx={p.x} cy={p.y} r={r}
                  fill={color}
                  stroke="rgba(7,9,15,0.6)" strokeWidth="1"
                />
                {/* Keystone inner dot */}
                {isKeystone && (
                  <circle
                    cx={p.x} cy={p.y} r={r * 0.35}
                    fill="rgba(7,9,15,0.55)"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Label */}
                <text
                  x={p.x} y={p.y + r + 14}
                  textAnchor="middle"
                  style={{
                    fill: 'rgba(242,244,248,0.9)',
                    fontFamily: "'Poppins', -apple-system, sans-serif",
                    fontSize: isKeystone ? 11.5 : 10,
                    fontWeight: isCenter || isKeystone || isHovered ? 600 : 500,
                    opacity: isDimmed ? 0.25 : isCenter || isHovered || isNeighbor ? 1 : 0.75,
                    transition: 'opacity 0.2s',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  } as React.CSSProperties}
                >
                  {short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="pg-mini-subgraph__hint">
        Hover to see why markets connect · click a node to explore
      </p>
    </div>
  );
}
