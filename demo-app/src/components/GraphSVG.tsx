import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import type { GraphNode, GraphEdge, GraphData } from '../graph/types';

// ─── Design constants (from prototype data.js) ────────────────────────────────

const CANVAS_W = 1000;
const CANVAS_H = 680;

export const DESIGN_COLORS = ['#5468E8', '#E61D25', '#D1D4D1', '#3CAC3B'] as const;

const CLUSTER_SHORTS = ['CORE', 'LEGACY', 'ATTENTION', 'TRAVEL'] as const;

const CLUSTER_REGIONS: Record<number, { x: number; y: number }> = {
  0: { x: 380, y: 290 },
  1: { x: 780, y: 230 },
  2: { x: 800, y: 540 },
  3: { x: 180, y: 560 },
};

// Keystones are larger (r=14 base) and have an inner dot
const KEYSTONES = new Set(['129', '93', '73']);

// Hand-placed positions from prototype — designed so the layout reads
export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
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

// Short display labels (what fits on the graph)
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

// Edge kinds from prototype — drives arrow / dash / double-stroke rendering
type EdgeKind = 'causal' | 'shared' | 'spillover' | 'amplify';

// Bidirectional lookup  "srcId|tgtId" → kind
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoverState {
  id: string;
  x: number;
  y: number;
}

export interface GraphSVGProps {
  graphData: GraphData | null;
  focusedId: string | null;
  filterCluster: number | null;
  hoveredConnId: string | null;
  introStage?: number; // 0=halos, 1=+nodes, 2=+edges, 3+=fully on (default 3)
  /** Set of node ids currently selected for combined-strategy mode. */
  selectedIds?: Set<string>;
  /** When true, the canvas shows a hint banner — visual only. */
  strategyMode?: boolean;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GraphSVG({
  graphData, focusedId, filterCluster, hoveredConnId, introStage = 3,
  selectedIds, strategyMode = false,
  onNodeClick, onBackgroundClick, onNodeHover,
}: GraphSVGProps) {
  const showNodes = introStage >= 1;
  const showEdges = introStage >= 2;
  // ── Build index: adjacency + degree ─────────────────────────────────────
  const { adj, degree } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const degree = new Map<string, number>();
    if (!graphData) return { adj, degree };
    for (const n of graphData.nodes) {
      adj.set(n.id, new Set());
      degree.set(n.id, 0);
    }
    for (const e of graphData.edges) {
      adj.get(e.source)?.add(e.target);
      adj.get(e.target)?.add(e.source);
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    return { adj, degree };
  }, [graphData]);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    if (!graphData) return m;
    for (const n of graphData.nodes) m.set(n.id, n);
    return m;
  }, [graphData]);

  // ── Drift animation — ~16fps, cheap ────────────────────────────────────
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const loop = (t: number) => {
      if (t - last > 60) {
        setTick(v => (v + 1) % 100000);
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Animated positions = anchor + sinusoidal drift
  const positions = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    if (!graphData) return out;
    const t = tick / 18;
    for (const n of graphData.nodes) {
      const anchor = NODE_POSITIONS[n.id] ?? { x: 500, y: 340 };
      const seed = Number(n.id) % 100;
      out.set(n.id, {
        x: anchor.x + Math.sin(t * 0.25 + seed * 0.7) * 3.2,
        y: anchor.y + Math.cos(t * 0.2  + seed * 0.5) * 2.6,
      });
    }
    return out;
  }, [graphData, tick]);

  // Cluster halo ellipses — computed from static anchors (don't drift)
  const clusterHalos = useMemo(() => {
    if (!graphData) return [];
    const groups = new Map<number, string[]>();
    for (const n of graphData.nodes) {
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n.id);
    }
    return [...groups.entries()].map(([g, ids]) => {
      const xs = ids.map(id => NODE_POSITIONS[id]?.x ?? 500);
      const ys = ids.map(id => NODE_POSITIONS[id]?.y ?? 340);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rx = Math.max(140, (Math.max(...xs) - Math.min(...xs)) / 2 + 90);
      const ry = Math.max(110, (Math.max(...ys) - Math.min(...ys)) / 2 + 80);
      return { g, cx, cy, rx, ry };
    });
  }, [graphData]);

  // Neighbors of focused node
  const focusedNeighbors = useMemo(
    () => focusedId ? (adj.get(focusedId) ?? new Set<string>()) : null,
    [focusedId, adj],
  );

  // Local hover state (id + viewport coords for the chip)
  const [hover, setHover] = useState<HoverState | null>(null);

  // Edges sorted strong-on-top
  const sortedEdges = useMemo(() => {
    if (!graphData) return [];
    const w: Record<string, number> = { strong: 3, medium: 2, weak: 1 };
    return [...graphData.edges].sort((a, b) => w[a.strength] - w[b.strength]);
  }, [graphData]);

  // ── Derived visibility helpers ──────────────────────────────────────────
  const dimNode = useCallback((n: GraphNode) => {
    if (filterCluster !== null && n.group !== filterCluster) return true;
    if (selectedIds?.has(n.id)) return false;  // selected stays bright
    if (focusedId) return n.id !== focusedId && !focusedNeighbors?.has(n.id);
    if (hover && hover.id !== n.id && !adj.get(hover.id)?.has(n.id)) return true;
    return false;
  }, [filterCluster, focusedId, focusedNeighbors, hover, adj, selectedIds]);

  const edgeIsActive = useCallback((e: GraphEdge) => {
    if (focusedId) return e.source === focusedId || e.target === focusedId;
    if (hover) return e.source === hover.id || e.target === hover.id;
    return false;
  }, [focusedId, hover]);

  const isSelected = useCallback(
    (id: string) => !!selectedIds && selectedIds.has(id),
    [selectedIds],
  );

  const edgeIsBetweenSelected = useCallback(
    (e: GraphEdge) => !!selectedIds && selectedIds.has(e.source) && selectedIds.has(e.target),
    [selectedIds],
  );

  const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const hoveredEdgeKey = hoveredConnId && focusedId
    ? edgeKey(focusedId, hoveredConnId) : null;

  // ── Event handlers ─────────────────────────────────────────────────────
  const handleNodeEnter = useCallback((n: GraphNode, e: React.MouseEvent) => {
    setHover({ id: n.id, x: e.clientX, y: e.clientY });
    onNodeHover?.(n);
  }, [onNodeHover]);

  const handleNodeMove = useCallback((e: React.MouseEvent) => {
    setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h);
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHover(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.classList.contains('graph-bg')) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

  if (!graphData) return null;

  return (
    <>
      <svg
        className="graph-svg"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          display: 'block', overflow: 'visible',
        }}
      >
        <defs>
          {/* Halo gradients — one per cluster */}
          {DESIGN_COLORS.map((color, i) => (
            <radialGradient key={`halo-${i}`} id={`halo-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
              <stop offset="60%"  stopColor={color} stopOpacity="0.06"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </radialGradient>
          ))}
          {/* Node glow gradients */}
          {DESIGN_COLORS.map((color, i) => (
            <radialGradient key={`glow-${i}`} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.7"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </radialGradient>
          ))}
          {/* Causal edge arrowhead */}
          <marker
            id="arrow"
            viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(230,236,247,0.85)"/>
          </marker>
        </defs>

        {/* Background click catcher */}
        <rect className="graph-bg" x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="transparent"/>

        {/* ── Layer 1: Cluster halos + region labels ── */}
        <g>
          {clusterHalos.map(({ g, cx, cy, rx, ry }) => {
            const dim = filterCluster !== null && filterCluster !== g;
            const region = CLUSTER_REGIONS[g] ?? { x: cx, y: cy - ry - 20 };
            return (
              <g key={g} style={{ opacity: dim ? 0.18 : 1, transition: 'opacity 0.4s' }}>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#halo-${g})`}/>
                <text
                  x={region.x} y={region.y}
                  textAnchor="middle"
                  style={{
                    fill: DESIGN_COLORS[g],
                    opacity: dim ? 0.18 : (focusedId ? 0.35 : 0.55),
                    fontFamily: "'Poppins', -apple-system, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  } as React.CSSProperties}
                >
                  {CLUSTER_SHORTS[g as 0|1|2|3]}
                </text>
              </g>
            );
          })}
        </g>

        {/* ── Layer 2: Edges ── */}
        {showEdges && <g>
          {sortedEdges.map((e, i) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;

            const active = edgeIsActive(e);
            const k = edgeKey(e.source, e.target);
            const isHoveredConn = hoveredEdgeKey === k;
            const kind = getEdgeKind(e.source, e.target);

            // Bézier midpoint + perpendicular curve
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return null;
            const nx = -dy / len, ny = dx / len;
            const curve = Math.min(len * 0.06, 22);
            const cpx = (a.x + b.x) / 2 + nx * curve;
            const cpy = (a.y + b.y) / 2 + ny * curve;

            // Stroke width
            const sw = isHoveredConn ? 3.6
              : active
                ? (e.strength === 'strong' ? 2.8 : e.strength === 'medium' ? 2.0 : 1.4)
                : (e.strength === 'strong' ? 1.6 : e.strength === 'medium' ? 1.0 : 0.6);

            // Opacity
            let opacity: number;
            if (isHoveredConn) {
              opacity = 1;
            } else if (filterCluster !== null) {
              const an = nodeById.get(e.source), bn = nodeById.get(e.target);
              opacity = (an?.group === filterCluster || bn?.group === filterCluster)
                ? (active ? 0.92 : 0.40) : 0.05;
            } else if (focusedId) {
              opacity = active ? 0.95 : 0.08;
            } else if (hover) {
              opacity = active ? 0.85 : 0.14;
            } else {
              opacity = e.strength === 'strong' ? 0.55 : e.strength === 'medium' ? 0.32 : 0.18;
            }

            const stroke = isHoveredConn ? '#ffffff' : 'rgba(230,236,247,0.92)';
            const d = `M ${a.x} ${a.y} Q ${cpx} ${cpy} ${b.x} ${b.y}`;
            const showLabel = active || isHoveredConn;
            const labelText = e.reason.length > 38 ? e.reason.slice(0, 36) + '…' : e.reason;

            const isBetweenSelected = edgeIsBetweenSelected(e);
            const finalStroke = isBetweenSelected ? 'var(--pg-combo-green)' : stroke;
            const finalOpacity = isBetweenSelected ? 0.95 : opacity;
            const finalSw = isBetweenSelected ? Math.max(sw, 2.4) : sw;

            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={finalStroke}
                  strokeWidth={finalSw}
                  strokeOpacity={finalOpacity}
                  strokeDasharray={kind === 'spillover' ? '5 4' : undefined}
                  strokeLinecap="round"
                  markerEnd={kind === 'causal' ? 'url(#arrow)' : undefined}
                  style={{ transition: 'stroke-width 0.18s, stroke-opacity 0.18s' }}
                />
                {/* Double-stroke for amplify edges */}
                {kind === 'amplify' && (
                  <path
                    d={d}
                    fill="none"
                    stroke={finalStroke}
                    strokeWidth={Math.max(finalSw - 1, 0.5)}
                    strokeOpacity={finalOpacity * 0.55}
                    strokeLinecap="round"
                    transform={`translate(${nx * 3.2}, ${ny * 3.2})`}
                  />
                )}
                {/* Edge reason label — shown on active / hovered-conn edges */}
                {showLabel && (
                  <text
                    x={cpx} y={cpy + 3}
                    textAnchor="middle"
                    style={{
                      fill: isHoveredConn ? '#ffffff' : 'rgba(220,230,250,0.78)',
                      fontFamily: "'Noto Sans', -apple-system, sans-serif",
                      fontSize: 9.5,
                      fontWeight: isHoveredConn ? 600 : 400,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    } as React.CSSProperties}
                  >
                    {labelText}
                  </text>
                )}
              </g>
            );
          })}
        </g>}

        {/* ── Layer 3: Nodes ── */}
        {showNodes && <g>
          {graphData.nodes.map(n => {
            const p = positions.get(n.id);
            if (!p) return null;

            const deg = degree.get(n.id) ?? 0;
            const isKeystone = KEYSTONES.has(n.id);
            const r = nodeRadius(deg, isKeystone);
            const color = DESIGN_COLORS[n.group % 4];
            const isFocused = focusedId === n.id;
            const isHovered = hover?.id === n.id;
            const isDimmed = dimNode(n);
            const isNeighbor = !!(focusedId && focusedNeighbors?.has(n.id));
            const short = NODE_SHORTS[n.id] ?? n.title;
            const labelOpacity = isDimmed ? 0.25
              : (isFocused || isKeystone || isHovered || isNeighbor ? 1 : 0.75);

            return (
              <g
                key={n.id}
                style={{
                  opacity: isDimmed ? 0.22 : 1,
                  transition: 'opacity 0.25s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => handleNodeEnter(n, e)}
                onMouseMove={handleNodeMove}
                onMouseLeave={handleNodeLeave}
                onClick={(e) => { e.stopPropagation(); onNodeClick(n.id); }}
              >
                {/* Glow circle */}
                <circle
                  cx={p.x} cy={p.y}
                  r={r + (isFocused ? 18 : isHovered ? 14 : isNeighbor ? 10 : 6)}
                  fill={`url(#glow-${n.group})`}
                  style={{
                    opacity: isFocused ? 1 : isHovered ? 0.9 : isNeighbor ? 0.7 : (isKeystone ? 0.6 : 0.35),
                    transition: 'opacity 0.25s',
                    pointerEvents: 'none',
                  }}
                />
                {/* Focus / hover ring */}
                {(isFocused || isHovered) && (
                  <circle
                    cx={p.x} cy={p.y} r={r + 5}
                    fill="none" stroke={color}
                    strokeOpacity="0.6" strokeWidth="1.5"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Combo-selected: outer green ring */}
                {isSelected(n.id) && (
                  <circle
                    cx={p.x} cy={p.y} r={r + 9}
                    fill="none"
                    stroke="var(--pg-combo-green)"
                    strokeWidth="2.2"
                    strokeOpacity="0.95"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Combo-selected: ✓ badge top-right */}
                {isSelected(n.id) && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle
                      cx={p.x + r + 4} cy={p.y - r - 4} r={7}
                      fill="var(--pg-combo-green)"
                      stroke="rgba(7,9,15,0.6)" strokeWidth="1"
                    />
                    <text
                      x={p.x + r + 4} y={p.y - r - 1}
                      textAnchor="middle"
                      style={{
                        fill: '#08110b',
                        fontFamily: "'Poppins', -apple-system, sans-serif",
                        fontSize: 9,
                        fontWeight: 800,
                        userSelect: 'none',
                      } as React.CSSProperties}
                    >✓</text>
                  </g>
                )}
                {/* Core circle */}
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
                    fontWeight: isKeystone || isFocused ? 600 : 500,
                    opacity: labelOpacity,
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
        </g>}
      </svg>

      {strategyMode && (
        <div className="pg-combo-hint">
          Tap markets to combine them — green ✓ = added · tap again to remove
        </div>
      )}

      {/* Hover chip — DOM-positioned via viewport coords, not SVG-scaled */}
      {showNodes && hover && !focusedId && (() => {
        const n = nodeById.get(hover.id);
        if (!n) return null;
        const color = DESIGN_COLORS[n.group % 4];
        const clusterShort = CLUSTER_SHORTS[n.group as 0|1|2|3];
        return (
          <div
            className="pg-hover-chip"
            style={{
              position: 'fixed',
              left: hover.x + 18,
              top: hover.y - 8,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <div className="pg-hover-chip__cluster" style={{ color }}>
              <span className="pg-hover-chip__dot" style={{ background: color }}/>
              {clusterShort}
            </div>
            <p className="pg-hover-chip__title">{n.title}</p>
            <p className="pg-hover-chip__hint">Click to read the story →</p>
          </div>
        );
      })()}
    </>
  );
}
