import React, {
  useRef, useState, useMemo, useCallback, useEffect,
} from 'react';
import { useNavigate } from 'react-router-dom';
import _ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = _ForceGraph2D as unknown as React.FC<any>;
// @ts-expect-error: d3-force-3d is the force library bundled with react-force-graph-2d
import { forceCollide, forceCenter } from 'd3-force-3d';
import type { GraphData, GraphNode, GraphEdge } from './graph/types';
import { clusterColor, BG_COLOR } from './graph/theme';

interface Props {
  centerNodeId: string;
  graphData: GraphData;
  height?: number;
}

const MINI = {
  linkDistance:   72,
  chargeStrength: -190,
  collideRadius:  16,
  centerStrength: 0.28,
  alphaDecay:     0.022,
  velocityDecay:  0.36,
};

const R_CENTER   = 12;
const R_NEIGHBOR = 7;

type FGNode = NodeObject & GraphNode;
type FGLink = GraphEdge & { source: string | NodeObject; target: string | NodeObject };

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function resolveId(x: string | NodeObject): string {
  if (typeof x === 'object' && x !== null) return String((x as NodeObject).id ?? '');
  return String(x);
}

export function MiniSubgraph({ centerNodeId, graphData, height = 260 }: Props) {
  const navigate     = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLDivElement>(null);
  const fgRef        = useRef<ForceGraphMethods>();
  const hasZoomed    = useRef(false);
  const [w, setW]    = useState(0);

  // Hover state — refs for canvas callbacks, state for re-render trigger
  const hoverIdRef      = useRef<string | null>(null);
  const neighborIdsRef  = useRef<Set<string>>(new Set());
  const hoverLinkRef    = useRef<FGLink | null>(null);
  const [hoverLink, setHoverLink] = useState<FGLink | null>(null);
  const [, setHoverTick] = useState(0); // triggers re-render so canvas redraws

  // Adjacency map within the subgraph
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of graphData.edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [graphData]);

  // Reset hover + zoom whenever the center changes
  useEffect(() => {
    hasZoomed.current = false;
    hoverIdRef.current = null;
    neighborIdsRef.current = new Set();
    hoverLinkRef.current = null;
    setHoverLink(null);
  }, [centerNodeId]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

    return {
      subNodes: [center, ...graphData.nodes.filter(n => neighborIds.has(n.id))],
      subEdges: neighborEdges,
    };
  }, [graphData, centerNodeId]);

  const fgData = useMemo(() => ({
    nodes: subNodes,
    links: subEdges.map(e => ({ ...e })),
  }), [subNodes, subEdges]);

  useEffect(() => {
    if (!fgRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fgRef.current.d3Force('link') as any)?.distance(MINI.linkDistance);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fgRef.current.d3Force('charge') as any)?.strength(MINI.chargeStrength);
    fgRef.current.d3Force('collide', forceCollide(MINI.collideRadius));
    fgRef.current.d3Force('center', forceCenter(0, 0).strength(MINI.centerStrength));
  }, [fgData, w]);

  const handleEngineStop = useCallback(() => {
    if (!hasZoomed.current) {
      fgRef.current?.zoomToFit(600, 32);
      hasZoomed.current = true;
    }
  }, []);

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    const id = node ? String(node.id ?? '') : null;
    hoverIdRef.current = id;
    neighborIdsRef.current = id ? (adjacencyMap.get(id) ?? new Set()) : new Set();
    if (id) { hoverLinkRef.current = null; setHoverLink(null); }
    setHoverTick(t => t + 1);
    if (containerRef.current) {
      const isNavigable = !!id && id !== centerNodeId;
      containerRef.current.style.cursor = isNavigable ? 'pointer' : 'default';
    }
  }, [adjacencyMap, centerNodeId]);

  const handleLinkHover = useCallback((link: object | null) => {
    const l = link as FGLink | null;
    hoverLinkRef.current = l;
    setHoverLink(l);
    setHoverTick(t => t + 1);
    if (containerRef.current) {
      containerRef.current.style.cursor = l ? 'crosshair' : 'default';
    }
  }, []);

  const handleNodeClick = useCallback((node: NodeObject) => {
    if (String(node.id) === centerNodeId) return;
    navigate(`/market/${node.id}`);
  }, [navigate, centerNodeId]);

  // ── Node painter — full hover system ────────────────────────────────────────
  const paintNode = useCallback((
    node: NodeObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const n        = node as FGNode;
    const { x = 0, y = 0 } = n;
    const id       = String(n.id);
    const isCenter = id === centerNodeId;
    const color    = clusterColor(n.group ?? 0);

    const hoverId    = hoverIdRef.current;
    const isHovered  = id === hoverId;
    const isNeighbor = !!hoverId && neighborIdsRef.current.has(id);
    const hasHover   = hoverId !== null;
    const isDimmed   = hasHover && !isHovered && !isNeighbor && !isCenter;

    const baseR = isCenter ? R_CENTER : R_NEIGHBOR;
    const r     = isHovered && !isCenter ? baseR + 2 : baseR;
    const alpha = isDimmed ? 0.08 : isHovered ? 1.0 : isCenter ? 1.0 : 0.78;

    const t       = Date.now() / 4200 + (n.group ?? 0) * 0.18;
    const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

    ctx.save();

    if (!isDimmed) {
      const glowR  = isCenter ? 28 : isHovered ? 22 : isNeighbor ? 16 : 12;
      const baseGA = isCenter ? 0.30 : isHovered ? 0.55 : isNeighbor ? 0.28 : 0.16;
      const glowA  = baseGA * (0.78 + 0.44 * breathe);

      ctx.shadowColor = color;
      ctx.shadowBlur  = glowR;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, glowA * 0.4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Core circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.fill();

    // Ring on center and hovered
    if (isCenter || isHovered) {
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth   = (isCenter ? 2.2 : 1.6) / globalScale;
      ctx.stroke();
    }

    // Label — always show for center; show for hover/neighbor; show at zoom > 0.8
    const showLabel = !isDimmed && (isCenter || isHovered || isNeighbor || globalScale > 0.8);
    if (showLabel) {
      const chars    = isCenter ? 22 : 20;
      const label    = truncate(n.title ?? '', chars);
      const fontSize = isCenter || isHovered
        ? Math.max(10 / globalScale, 5)
        : Math.max(8.5 / globalScale, 3.8);

      ctx.font         = `${isCenter || isHovered ? 700 : 500} ${fontSize}px -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 5;
      ctx.fillStyle    = hexToRgba('#e2e8f0', isCenter || isHovered ? 0.97 : isNeighbor ? 0.80 : 0.60);
      ctx.fillText(label, x, y + r + 3.5 / globalScale);
      ctx.shadowBlur   = 0;
    }

    ctx.restore();
  }, [centerNodeId]);

  // ── Edge reason label — on hovered node's edges OR directly hovered edge ────
  const paintLink = useCallback((link: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const l = link as FGLink;
    if (!l.reason) return;
    if (typeof l.source !== 'object' || typeof l.target !== 'object') return;

    const hoverId       = hoverIdRef.current;
    const isLinkHovered = hoverLinkRef.current === l;
    const src           = resolveId(l.source);
    const tgt           = resolveId(l.target);
    const connectedToNode = !!hoverId && (src === hoverId || tgt === hoverId);

    if (!connectedToNode && !isLinkHovered) return;

    const s  = l.source as FGNode;
    const t  = l.target as FGNode;
    const mx = ((s.x ?? 0) + (t.x ?? 0)) / 2;
    const my = ((s.y ?? 0) + (t.y ?? 0)) / 2;

    const text     = truncate(l.reason, 26);
    const fontSize = isLinkHovered
      ? Math.max(8.5 / globalScale, 3.5)
      : Math.max(7 / globalScale, 3);

    ctx.font         = `${isLinkHovered ? 600 : 400} ${fontSize}px -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tw  = ctx.measureText(text).width;
    const pad = 3 / globalScale;
    ctx.fillStyle = isLinkHovered ? 'rgba(8,11,18,0.92)' : 'rgba(8,11,18,0.78)';
    ctx.fillRect(mx - tw / 2 - pad, my - fontSize / 2 - pad, tw + pad * 2, fontSize + pad * 2);
    ctx.fillStyle = isLinkHovered ? 'rgba(226,232,240,0.95)' : 'rgba(226,232,240,0.62)';
    ctx.fillText(text, mx, my);
  }, []);

  // ── Link color — highlight on hover, dim others ──────────────────────────────
  const getLinkColor = useCallback((link: object) => {
    const l       = link as FGLink;
    const src     = resolveId(l.source as string | NodeObject);
    const tgt     = resolveId(l.target as string | NodeObject);
    const hoverId = hoverIdRef.current;

    if (hoverLinkRef.current === l) return 'rgba(255,255,255,0.95)';

    if (!hoverId) {
      return l.strength === 'strong'
        ? 'rgba(255,255,255,0.62)'
        : 'rgba(255,255,255,0.35)';
    }
    if (src === hoverId || tgt === hoverId) return 'rgba(255,255,255,0.95)';
    return 'rgba(255,255,255,0.06)';
  }, []);

  const getLinkWidth = useCallback((link: object) => {
    const l       = link as FGLink;
    const src     = resolveId(l.source as string | NodeObject);
    const tgt     = resolveId(l.target as string | NodeObject);
    const hoverId = hoverIdRef.current;

    if (hoverLinkRef.current === l) return 2.8;
    if (hoverId && (src === hoverId || tgt === hoverId)) return 2.8;
    return l.strength === 'strong' ? 2.0 : 1.2;
  }, []);

  const paintNodeArea = useCallback((node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
    const { x = 0, y = 0 } = node;
    const isCenter = String(node.id) === centerNodeId;
    const r = (isCenter ? R_CENTER : R_NEIGHBOR) + 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [centerNodeId]);

  const paintLinkArea = useCallback((link: object, color: string, ctx: CanvasRenderingContext2D) => {
    const l = link as FGLink;
    if (typeof l.source !== 'object' || typeof l.target !== 'object') return;
    const src = l.source as FGNode;
    const tgt = l.target as FGNode;
    ctx.beginPath();
    ctx.moveTo(src.x ?? 0, src.y ?? 0);
    ctx.lineTo(tgt.x ?? 0, tgt.y ?? 0);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 10;
    ctx.stroke();
  }, []);

  if (subNodes.length < 2) return null;

  // Edge tooltip content derived from hoverLink state (React render)
  const edgeSrc = hoverLink && typeof hoverLink.source === 'object' ? hoverLink.source as FGNode : null;
  const edgeTgt = hoverLink && typeof hoverLink.target === 'object' ? hoverLink.target as FGNode : null;

  return (
    <div ref={containerRef} className="pg-mini-subgraph">
      <div ref={canvasRef} className="pg-mini-subgraph__canvas" style={{ position: 'relative' }}>
        {w > 0 && (
          <ForceGraph2D
            ref={fgRef as React.MutableRefObject<ForceGraphMethods>}
            width={w}
            height={height}
            graphData={fgData}
            backgroundColor={BG_COLOR}
            nodeId="id"
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={paintNodeArea}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkCanvasObject={paintLink}
            linkCanvasObjectMode={() => 'after'}
            linkPointerAreaPaint={paintLinkArea}
            onNodeHover={handleNodeHover}
            onLinkHover={handleLinkHover}
            onNodeClick={handleNodeClick}
            onEngineStop={handleEngineStop}
            d3AlphaDecay={MINI.alphaDecay}
            d3VelocityDecay={MINI.velocityDecay}
            enableNodeDrag={false}
            warmupTicks={80}
            cooldownTicks={Infinity}
            enableZoomInteraction
            enablePanInteraction
          />
        )}

        {/* Edge tooltip — floats inside the canvas box */}
        {hoverLink && edgeSrc && edgeTgt && hoverLink.reason && (
          <div className="pg-mini-subgraph__edge-tip">
            <p className="pg-mini-subgraph__edge-reason">"{hoverLink.reason}"</p>
            <div className="pg-mini-subgraph__edge-markets">
              <span style={{ color: clusterColor(edgeSrc.group ?? 0) }}>
                {truncate(edgeSrc.title, 22)}
              </span>
              <span className="pg-mini-subgraph__edge-arrow">↔</span>
              <span style={{ color: clusterColor(edgeTgt.group ?? 0) }}>
                {truncate(edgeTgt.title, 22)}
              </span>
            </div>
          </div>
        )}
      </div>
      <p className="pg-mini-subgraph__hint">Hover edges to see why markets connect · Click a node to explore</p>
    </div>
  );
}
