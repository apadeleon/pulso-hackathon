import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import type { GraphNode, GraphEdge, GraphData } from '../graph/types';
import { useForceLayout } from '../graph/useForceLayout';

// ─── Design constants (from prototype data.js) ────────────────────────────────

const CANVAS_W = 1000;
const CANVAS_H = 680;

// Mobile portrait canvas
const MOBILE_CANVAS_W = 500;
const MOBILE_CANVAS_H = 850;

export const DESIGN_COLORS = ['#5468E8', '#E61D25', '#D1D4D1', '#3CAC3B'] as const;

const CLUSTER_SHORTS = ['CORE', 'LEGACY', 'ATTENTION', 'TRAVEL'] as const;

const CLUSTER_REGIONS: Record<number, { x: number; y: number }> = {
  0: { x: 380, y: 290 },
  1: { x: 780, y: 230 },
  2: { x: 800, y: 540 },
  3: { x: 180, y: 560 },
};

const MOBILE_CLUSTER_REGIONS: Record<number, { x: number; y: number }> = {
  0: { x: 210, y: 180 },
  1: { x: 390, y: 260 },
  2: { x: 340, y: 600 },
  3: { x: 100, y: 480 },
};

const MOBILE_CLUSTER_SEEDS: Record<number, { x: number; y: number }> = {
  0: { x: 210, y: 220 },
  1: { x: 390, y: 300 },
  2: { x: 340, y: 640 },
  3: { x: 100, y: 500 },
};

// Keystones are larger (r=14 base) and have an inner dot
const KEYSTONES = new Set(['129', '93', '73']);

// Hand-placed positions — used as force layout seed so the graph starts in a good state
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

// Mobile portrait positions — clusters stacked vertically
const MOBILE_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Core (top)
  '129': { x: 250, y: 200 },
  '249': { x: 145, y: 115 },
  '92':  { x: 100, y: 220 },
  '247': { x: 165, y: 310 },
  '246': { x: 300, y: 320 },
  '248': { x: 85,  y: 390 },
  // Legacy (middle-right)
  '245': { x: 380, y: 190 },
  '244': { x: 395, y: 310 },
  '93':  { x: 370, y: 430 },
  '34':  { x: 425, y: 120 },
  // Attention (bottom)
  '227': { x: 270, y: 560 },
  '222': { x: 345, y: 650 },
  '225': { x: 415, y: 560 },
  '231': { x: 385, y: 740 },
  // Travel (left-middle)
  '73':  { x: 105, y: 540 },
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
export type EdgeKind = 'causal' | 'shared' | 'spillover' | 'amplify';

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

export function getEdgeKind(src: string, tgt: string): EdgeKind {
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
  /** Edge currently selected (clicked) — stays highlighted with traveling pulse. */
  focusedEdge?: GraphEdge | null;
  /** Portrait layout for mobile screens. */
  isMobile?: boolean;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

// ─── Pan & Zoom constants ─────────────────────────────────────────────────────
const MIN_ZOOM = 0.4;      // max zoom-out (viewBox 2.5× original)
const MAX_ZOOM = 3.0;      // max zoom-in (viewBox 1/3 original)
const PAN_THRESHOLD = 4;   // px movement before committing to pan
const ZOOM_FACTOR = 1.08;  // ~8% per wheel tick

type VB = { x: number; y: number; w: number; h: number };

function clampViewBox(vb: VB, contentW: number, contentH: number): VB {
  const margin = 0.3;
  const minX = -(vb.w * (1 - margin));
  const maxX = contentW - vb.w * margin;
  const minY = -(vb.h * (1 - margin));
  const maxY = contentH - vb.h * margin;
  return {
    x: Math.min(Math.max(vb.x, minX), maxX),
    y: Math.min(Math.max(vb.y, minY), maxY),
    w: vb.w,
    h: vb.h,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GraphSVG({
  graphData, focusedId, filterCluster, hoveredConnId, introStage = 3,
  selectedIds, strategyMode = false, focusedEdge, isMobile = false,
  onNodeClick, onBackgroundClick, onNodeHover, onEdgeClick,
}: GraphSVGProps) {
  const showNodes = introStage >= 1;
  const showEdges = introStage >= 2;

  // Pick canvas dimensions and seeds based on viewport
  const cW = isMobile ? MOBILE_CANVAS_W : CANVAS_W;
  const cH = isMobile ? MOBILE_CANVAS_H : CANVAS_H;
  const nodePositions = isMobile ? MOBILE_NODE_POSITIONS : NODE_POSITIONS;
  const clusterRegions = isMobile ? MOBILE_CLUSTER_REGIONS : CLUSTER_REGIONS;

  // ── Force layout ────────────────────────────────────────────────────────
  const { stablePos, setOverride } = useForceLayout(
    graphData, nodePositions, cW, cH,
    isMobile ? MOBILE_CLUSTER_SEEDS : undefined,
  );

  // ── Drag support ────────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragMovedRef = useRef(false);

  // ── Centered default viewBox (fits content with padding) ──────────────
  const defaultVB = useMemo<VB>(() => {
    const pos = Object.values(nodePositions);
    if (pos.length === 0) return { x: 0, y: 0, w: cW, h: cH };
    const PAD = 90;
    const xs = pos.map(p => p.x);
    const ys = pos.map(p => p.y);
    const contentCX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const contentCY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + PAD * 2, cW);
    const h = Math.max(Math.max(...ys) - Math.min(...ys) + PAD * 2, cH);
    return { x: contentCX - w / 2, y: contentCY - h / 2, w, h };
  }, [nodePositions, cW, cH]);

  // ── Pan & Zoom state ──────────────────────────────────────────────────
  const [viewBox, setViewBox] = useState<VB>(defaultVB);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const defaultVBRef = useRef(defaultVB);
  defaultVBRef.current = defaultVB;

  const panStartRef = useRef<{ clientX: number; clientY: number; vbx: number; vby: number } | null>(null);
  const panMovedRef = useRef(false);
  const isPanningRef = useRef(false);

  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartVBRef = useRef<VB | null>(null);
  const pinchCenterRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const lastTapRef = useRef(0);

  const isDefaultView = Math.abs(viewBox.x - defaultVB.x) < 1
    && Math.abs(viewBox.y - defaultVB.y) < 1
    && Math.abs(viewBox.w - defaultVB.w) < 1
    && Math.abs(viewBox.h - defaultVB.h) < 1;

  // Reset viewBox when canvas dimensions change (mobile ↔ desktop)
  useEffect(() => {
    setViewBox(defaultVB);
  }, [defaultVB]);

  const getSvgCoords = useCallback((e: React.MouseEvent | { clientX: number; clientY: number }): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // ── Mouse pan & drag ──────────────────────────────────────────────────
  // Pan starts on ANY mousedown that reaches the SVG. Nodes and edge hit
  // areas already call stopPropagation(), so those never reach here.
  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    panStartRef.current = { clientX: e.clientX, clientY: e.clientY, vbx: viewBox.x, vby: viewBox.y };
    panMovedRef.current = false;
    isPanningRef.current = false;
  }, [viewBox.x, viewBox.y]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    // Node drag takes priority
    if (draggingId) {
      dragMovedRef.current = true;
      const pos = getSvgCoords(e);
      setOverride(draggingId, {
        x: Math.min(Math.max(pos.x, 60), cW - 60),
        y: Math.min(Math.max(pos.y, 60), cH - 60),
      });
      return;
    }
    // Pan
    if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      if (!panMovedRef.current && Math.sqrt(dx * dx + dy * dy) < PAN_THRESHOLD) return;
      panMovedRef.current = true;
      isPanningRef.current = true;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const next: VB = {
        x: panStartRef.current.vbx - dx * scaleX,
        y: panStartRef.current.vby - dy * scaleY,
        w: viewBox.w,
        h: viewBox.h,
      };
      setViewBox(clampViewBox(next, cW, cH));
    }
  }, [draggingId, getSvgCoords, setOverride, cW, cH, viewBox.w, viewBox.h]);

  const handleSvgMouseUp = useCallback(() => {
    setDraggingId(null);
    panStartRef.current = null;
    isPanningRef.current = false;
  }, []);

  // ── Wheel zoom (non-passive) ──────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const vb = viewBoxRef.current;
      const dvb = defaultVBRef.current;
      const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newW = Math.min(Math.max(vb.w * factor, dvb.w / MAX_ZOOM), dvb.w / MIN_ZOOM);
      const newH = Math.min(Math.max(vb.h * factor, dvb.h / MAX_ZOOM), dvb.h / MIN_ZOOM);
      // Keep point under cursor fixed
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const next: VB = {
        x: svgPt.x - (svgPt.x - vb.x) * (newW / vb.w),
        y: svgPt.y - (svgPt.y - vb.y) * (newH / vb.h),
        w: newW,
        h: newH,
      };
      setViewBox(clampViewBox(next, cW, cH));
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [cW, cH]);

  // ── Touch: pan + pinch-to-zoom ────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartVBRef.current = { ...viewBox };
      pinchCenterRef.current = {
        clientX: (t1.clientX + t2.clientX) / 2,
        clientY: (t1.clientY + t2.clientY) / 2,
      };
      panStartRef.current = null;
      return;
    }
    if (e.touches.length === 1 && !draggingId) {
      // Node/edge touchstarts call stopPropagation, so this only fires on
      // empty space (halos, labels, background, gaps between nodes).
      panStartRef.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        vbx: viewBox.x,
        vby: viewBox.y,
      };
      panMovedRef.current = false;
      isPanningRef.current = false;
    }
  }, [viewBox, draggingId]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    // Node drag via touch
    if (e.touches.length === 1 && draggingId) {
      dragMovedRef.current = true;
      const t = e.touches[0];
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = t.clientX;
      pt.y = t.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      setOverride(draggingId, {
        x: Math.min(Math.max(svgP.x, 60), cW - 60),
        y: Math.min(Math.max(svgP.y, 60), cH - 60),
      });
      return;
    }
    // Single-finger pan
    if (e.touches.length === 1 && panStartRef.current && !draggingId) {
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.clientX;
      const dy = t.clientY - panStartRef.current.clientY;
      if (!panMovedRef.current && Math.sqrt(dx * dx + dy * dy) < PAN_THRESHOLD) return;
      panMovedRef.current = true;
      isPanningRef.current = true;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const next: VB = {
        x: panStartRef.current.vbx - dx * scaleX,
        y: panStartRef.current.vby - dy * scaleY,
        w: viewBox.w,
        h: viewBox.h,
      };
      setViewBox(clampViewBox(next, cW, cH));
    }
    // Pinch-to-zoom
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = pinchStartDistRef.current / dist;
      const startVB = pinchStartVBRef.current!;
      const newW = Math.min(Math.max(startVB.w * ratio, defaultVB.w / MAX_ZOOM), defaultVB.w / MIN_ZOOM);
      const newH = Math.min(Math.max(startVB.h * ratio, defaultVB.h / MAX_ZOOM), defaultVB.h / MIN_ZOOM);
      const center = pinchCenterRef.current!;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const fx = (center.clientX - rect.left) / rect.width;
      const fy = (center.clientY - rect.top) / rect.height;
      const svgCenterX = startVB.x + fx * startVB.w;
      const svgCenterY = startVB.y + fy * startVB.h;
      const next: VB = {
        x: svgCenterX - fx * newW,
        y: svgCenterY - fy * newH,
        w: newW,
        h: newH,
      };
      setViewBox(clampViewBox(next, cW, cH));
    }
  }, [draggingId, setOverride, cW, cH, viewBox.w, viewBox.h]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      pinchStartVBRef.current = null;
      pinchCenterRef.current = null;
    }
    if (e.touches.length === 0) {
      // Double-tap to reset
      const target = e.target as Element;
      const isBg = target.tagName === 'svg' || target.classList.contains('graph-bg');
      if (isBg && !panMovedRef.current) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setViewBox(defaultVB);
        }
        lastTapRef.current = now;
      }
      panStartRef.current = null;
      isPanningRef.current = false;
      setDraggingId(null);
    }
  }, [cW, cH]);

  // ── Double-click to reset (desktop) ───────────────────────────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.classList.contains('graph-bg')) {
      e.preventDefault();
      setViewBox(defaultVB);
    }
  }, [defaultVB]);

  // ── Build index: adjacency + degree ─────────────────────────────────────
  const { adj, degree } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const degree = new Map<string, number>();
    if (!graphData) return { adj, degree };
    for (const n of graphData.nodes) {
      adj.set(n.id, new Set());
      degree.set(n.id, 0);
    }
    for (const edge of graphData.edges) {
      adj.get(edge.source)?.add(edge.target);
      adj.get(edge.target)?.add(edge.source);
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
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

  // Animated positions = stable anchor + sinusoidal drift
  const positions = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    if (!graphData) return out;
    const t = tick / 18;
    for (const n of graphData.nodes) {
      // Use force layout positions if available, else fall back to hand-placed seed
      const anchor = stablePos.size > 0
        ? (stablePos.get(n.id) ?? nodePositions[n.id] ?? { x: cW / 2, y: cH / 2 })
        : (nodePositions[n.id] ?? { x: cW / 2, y: cH / 2 });
      // Suppress drift while this node is being dragged
      if (n.id === draggingId) {
        out.set(n.id, anchor);
        continue;
      }
      const seed = Number(n.id) % 100;
      out.set(n.id, {
        x: anchor.x + Math.sin(t * 0.25 + seed * 0.7) * 3.2,
        y: anchor.y + Math.cos(t * 0.2  + seed * 0.5) * 2.6,
      });
    }
    return out;
  }, [graphData, tick, stablePos, draggingId, nodePositions, cW, cH]);

  // Cluster halo ellipses — computed from stable anchors (don't drift)
  const clusterHalos = useMemo(() => {
    if (!graphData) return [];
    const posSource = stablePos.size > 0 ? stablePos : new Map(Object.entries(nodePositions));
    const groups = new Map<number, string[]>();
    for (const n of graphData.nodes) {
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n.id);
    }
    return [...groups.entries()].map(([g, ids]) => {
      const xs = ids.map(id => posSource.get(id)?.x ?? 500);
      const ys = ids.map(id => posSource.get(id)?.y ?? 340);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rx = Math.max(140, (Math.max(...xs) - Math.min(...xs)) / 2 + 90);
      const ry = Math.max(110, (Math.max(...ys) - Math.min(...ys)) / 2 + 80);
      return { g, cx, cy, rx, ry };
    });
  }, [graphData, stablePos, nodePositions]);

  // Neighbors of focused node
  const focusedNeighbors = useMemo(
    () => focusedId ? (adj.get(focusedId) ?? new Set<string>()) : null,
    [focusedId, adj],
  );

  // Local hover state (id + viewport coords for the chip)
  const [hover, setHover] = useState<HoverState | null>(null);

  // Local edge hover state (by edge key "a|b" where a < b)
  const [localHoveredEdgeKey, setLocalHoveredEdgeKey] = useState<string | null>(null);

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

  const edgeIsActive = useCallback((edge: GraphEdge) => {
    if (focusedId) return edge.source === focusedId || edge.target === focusedId;
    if (hover) return edge.source === hover.id || edge.target === hover.id;
    return false;
  }, [focusedId, hover]);

  const isSelected = useCallback(
    (id: string) => !!selectedIds && selectedIds.has(id),
    [selectedIds],
  );

  const edgeIsBetweenSelected = useCallback(
    (edge: GraphEdge) => !!selectedIds && selectedIds.has(edge.source) && selectedIds.has(edge.target),
    [selectedIds],
  );

  const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;

  // Hovered-connection key from rail story hover (hoveredConnId prop)
  const railHoveredEdgeKey = hoveredConnId && focusedId
    ? edgeKey(focusedId, hoveredConnId) : null;

  // Key of the edge that was clicked and is shown in the rail
  const selectedEdgeKey = focusedEdge
    ? edgeKey(focusedEdge.source, focusedEdge.target) : null;

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
    // If user was panning, consume the click — don't deselect
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.classList.contains('graph-bg')) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

  if (!graphData) return null;

  return (
    <>
      <svg
        ref={svgRef}
        className={`graph-svg${isPanningRef.current ? ' panning' : ''}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          display: 'block', overflow: 'visible',
          cursor: draggingId ? 'grabbing' : (isPanningRef.current ? 'grabbing' : 'grab'),
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
        <rect className="graph-bg" x="0" y="0" width={cW} height={cH} fill="transparent"/>

        {/* ── Layer 1: Cluster halos + region labels ── */}
        <g>
          {clusterHalos.map(({ g, cx, cy, rx, ry }) => {
            const dim = filterCluster !== null && filterCluster !== g;
            const region = clusterRegions[g] ?? { x: cx, y: cy - ry - 20 };
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
          {sortedEdges.map((edge, i) => {
            const a = positions.get(edge.source);
            const b = positions.get(edge.target);
            if (!a || !b) return null;

            const active = edgeIsActive(edge);
            const k = edgeKey(edge.source, edge.target);
            const isRailHovered = railHoveredEdgeKey === k;
            const isLocallyHovered = localHoveredEdgeKey === k;
            const isSelectedEdge = selectedEdgeKey === k;
            const isHighlighted = isRailHovered || isLocallyHovered || isSelectedEdge;
            const kind = getEdgeKind(edge.source, edge.target);

            // Bézier midpoint + perpendicular curve
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return null;
            const nx = -dy / len, ny = dx / len;
            const curve = Math.min(len * 0.06, 22);
            const cpx = (a.x + b.x) / 2 + nx * curve;
            const cpy = (a.y + b.y) / 2 + ny * curve;

            // Stroke width — locally hovered gets a more dramatic grow
            const sw = isLocallyHovered
              ? (edge.strength === 'strong' ? 5.5 : edge.strength === 'medium' ? 4.5 : 3.5)
              : (isRailHovered || isSelectedEdge) ? 3.6
              : active
                ? (edge.strength === 'strong' ? 2.8 : edge.strength === 'medium' ? 2.0 : 1.4)
                : (edge.strength === 'strong' ? 1.6 : edge.strength === 'medium' ? 1.0 : 0.6);

            // Opacity
            let opacity: number;
            if (isHighlighted) {
              opacity = 1;
            } else if (filterCluster !== null) {
              const an = nodeById.get(edge.source), bn = nodeById.get(edge.target);
              opacity = (an?.group === filterCluster || bn?.group === filterCluster)
                ? (active ? 0.92 : 0.40) : 0.05;
            } else if (focusedId) {
              opacity = active ? 0.95 : 0.08;
            } else if (hover) {
              opacity = active ? 0.85 : 0.14;
            } else {
              opacity = edge.strength === 'strong' ? 0.55 : edge.strength === 'medium' ? 0.32 : 0.18;
            }

            const stroke = isHighlighted ? '#ffffff' : 'rgba(230,236,247,0.92)';
            const d = `M ${a.x} ${a.y} Q ${cpx} ${cpy} ${b.x} ${b.y}`;
            const showLabel = active || isHighlighted;
            const labelText = edge.reason.length > 38 ? edge.reason.slice(0, 36) + '…' : edge.reason;

            const isBetweenSelected = edgeIsBetweenSelected(edge);
            const finalStroke = isBetweenSelected ? 'var(--pg-combo-green)' : stroke;
            const finalOpacity = isBetweenSelected ? 0.95 : opacity;
            const finalSw = isBetweenSelected ? Math.max(sw, 2.4) : sw;

            return (
              // Outer <g>: entrance animation (plays once)
              <g key={i} style={{ animation: 'pg-edge-enter 0.9s ease both', animationDelay: `${i * 28}ms` }}>
                {/* Inner <g>: pulse animation when locally hovered */}
                <g style={isLocallyHovered ? { animation: 'pg-edge-pulse 1.3s ease-in-out infinite' } : undefined}>
                  <path
                    d={d}
                    fill="none"
                    stroke={finalStroke}
                    strokeWidth={finalSw}
                    strokeOpacity={finalOpacity}
                    strokeDasharray={kind === 'spillover' ? '5 4' : undefined}
                    strokeLinecap="round"
                    markerEnd={kind === 'causal' ? 'url(#arrow)' : undefined}
                    style={{ transition: 'stroke-width 0.15s, stroke-opacity 0.18s', pointerEvents: 'none' }}
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
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Edge reason label — shown on active / highlighted edges */}
                  {showLabel && (
                    <text
                      x={cpx} y={cpy + 3}
                      textAnchor="middle"
                      style={{
                        fill: isHighlighted ? '#ffffff' : 'rgba(220,230,250,0.78)',
                        fontFamily: "'Noto Sans', -apple-system, sans-serif",
                        fontSize: 9.5,
                        fontWeight: isHighlighted ? 600 : 400,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      } as React.CSSProperties}
                    >
                      {labelText}
                    </text>
                  )}
                  {/* Traveling data-pulses — tick-driven so strokeDashoffset is in
                      real pixels (CSS animations ignore SVG pathLength). Three
                      pulses with uneven phase offsets give a random-packet feel. */}
                  {isSelectedEdge && (() => {
                    const PULSE_PX = 4;
                    const SPEED    = 22;   // px per second — slow, steady drift
                    const cycle    = len + PULSE_PX;
                    // Wall-clock time keeps speed perfectly constant across all edges
                    const elapsed  = performance.now() / 1000;
                    // Even thirds so all 3 pulses share the same rhythm
                    const phases   = [0, 1/3, 2/3];
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        {phases.map((phase, pi) => {
                          // Always positive advance — pulses only travel source→target
                          const offset = -((elapsed * SPEED + phase * cycle) % cycle);
                          return (
                            <React.Fragment key={pi}>
                              {/* Outer glow */}
                              <path
                                d={d} fill="none"
                                stroke="rgba(255,255,255,0.18)"
                                strokeWidth={10}
                                strokeLinecap="round"
                                strokeDasharray={`${PULSE_PX + 6} ${cycle * 10}`}
                                strokeDashoffset={offset - 3}
                                style={{ filter: 'blur(4px)' } as React.CSSProperties}
                              />
                              {/* Mid glow */}
                              <path
                                d={d} fill="none"
                                stroke="rgba(255,255,255,0.45)"
                                strokeWidth={5}
                                strokeLinecap="round"
                                strokeDasharray={`${PULSE_PX + 2} ${cycle * 10}`}
                                strokeDashoffset={offset - 1}
                                style={{ filter: 'blur(1.5px)' } as React.CSSProperties}
                              />
                              {/* Core bright dot */}
                              <path
                                d={d} fill="none"
                                stroke="rgba(255,255,255,1)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeDasharray={`${PULSE_PX} ${cycle * 10}`}
                                strokeDashoffset={offset}
                              />
                            </React.Fragment>
                          );
                        })}
                      </g>
                    );
                  })()}
                  {/* Transparent wide hit area — receives mouse events */}
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(0,0,0,0)"
                    strokeWidth={16}
                    style={{ cursor: onEdgeClick ? 'pointer' : 'default', pointerEvents: 'stroke' }}
                    onMouseDown={(ev) => ev.stopPropagation()}
                    onTouchStart={(ev) => ev.stopPropagation()}
                    onMouseEnter={() => setLocalHoveredEdgeKey(k)}
                    onMouseLeave={() => setLocalHoveredEdgeKey(null)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEdgeClick?.(edge);
                    }}
                  />
                </g>
              </g>
            );
          })}
        </g>}

        {/* ── Layer 3: Nodes ── */}
        {showNodes && <g>
          {graphData.nodes.map((n, i) => {
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
                  cursor: draggingId === n.id ? 'grabbing' : 'grab',
                  animation: 'pg-node-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                  animationDelay: `${i * 50}ms`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                } as React.CSSProperties}
                onMouseEnter={(e) => handleNodeEnter(n, e)}
                onMouseMove={handleNodeMove}
                onMouseLeave={handleNodeLeave}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dragMovedRef.current = false;
                  setDraggingId(n.id);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  dragMovedRef.current = false;
                  setDraggingId(n.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) { dragMovedRef.current = false; return; }
                  onNodeClick(n.id);
                }}
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

      {/* Reset-view button — only visible when panned/zoomed */}
      {!isDefaultView && (
        <button
          className="pg-zoom-reset"
          onClick={() => setViewBox(defaultVB)}
        >
          Reset view
        </button>
      )}
    </>
  );
}
