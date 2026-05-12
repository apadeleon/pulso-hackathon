import React, {
  useRef, useState, useMemo, useCallback, useEffect,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import _ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
// react-force-graph-2d's FCwithRef return type isn't compatible with React 19 ReactNode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = _ForceGraph2D as unknown as React.FC<any>;
// @ts-expect-error: d3-force-3d is the force library bundled with react-force-graph-2d
import { forceCollide, forceCenter } from 'd3-force-3d';
import { PasswordlessAuthWidget } from '@functionspace/ui';
import { useGraphData } from '../graph/useGraphData';
import { clusterColor, BG_COLOR, NODE, EDGE, FORCE, CLUSTER_COLORS } from '../graph/theme';
import { CLUSTER_LABELS, getEditorial } from '../graph/editorial';
import type { GraphNode, GraphEdge } from '../graph/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function nodeRadius(n: FGNode): number {
  const extra = Math.min((n.degree ?? 0), NODE.radiusDegreeMax / NODE.radiusPerDegree) * NODE.radiusPerDegree;
  return NODE.radius + extra;
}

// After the force graph processes links, source/target become node objects.
function resolveId(x: string | number | NodeObject): string {
  if (typeof x === 'object' && x !== null) return String((x as NodeObject).id ?? '');
  return String(x);
}

type FGNode = NodeObject & GraphNode;
type FGLink = GraphEdge & { source: string | NodeObject; target: string | NodeObject };


// ─── GraphHome ────────────────────────────────────────────────────────────────

export function GraphHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { graphData, loading, error } = useGraphData();

  // ── Sizing ─────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Force graph ref ─────────────────────────────────────────────────────────
  const fgRef = useRef<ForceGraphMethods>();
  const hasZoomedRef = useRef(false);

  // ── Hover state — refs for canvas callbacks, state for React tooltip ────────
  const hoverIdRef = useRef<string | null>(null);
  const neighborIdsRef = useRef<Set<string>>(new Set());
  const [hoverNode, setHoverNode] = useState<FGNode | null>(null);

  // Edge hover — tracked separately from node hover
  const hoverLinkRef = useRef<FGLink | null>(null);
  const [hoverLink, setHoverLink] = useState<FGLink | null>(null);

  // Clear all hover whenever the route changes (tooltip must never bleed into detail page)
  useEffect(() => {
    hoverIdRef.current = null;
    neighborIdsRef.current = new Set();
    hoverLinkRef.current = null;
    setHoverNode(null);
    setHoverLink(null);
  }, [location.pathname]);

  // ── Adjacency map (built from original string-ID edges before lib mutation) ─
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!graphData) return map;
    for (const e of graphData.edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [graphData]);

  // ── Convert edges → links (copy to prevent library from mutating originals) ─
  const fgData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    return {
      nodes: graphData.nodes,
      links: graphData.edges.map(e => ({ ...e })),
    };
  }, [graphData]);

  // ── Configure d3 forces once ForceGraph2D has mounted and data is ready ─────
  useEffect(() => {
    if (!fgRef.current || !graphData) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fgRef.current.d3Force('link') as any)?.distance(FORCE.linkDistance);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fgRef.current.d3Force('charge') as any)?.strength(FORCE.chargeStrength);
    fgRef.current.d3Force('collide', forceCollide(FORCE.collideRadius));
    // Pull the entire graph mass toward the center so it forms a tight cloud
    fgRef.current.d3Force('center', forceCenter(0, 0).strength(FORCE.centerStrength));
  }, [graphData, dims.w]);

  // ── Zoom to fit once the simulation settles ─────────────────────────────────
  const handleEngineStop = useCallback(() => {
    if (!hasZoomedRef.current) {
      fgRef.current?.zoomToFit(900, 16);
      hasZoomedRef.current = true;
    }
  }, []);

  // ── Hover ──────────────────────────────────────────────────────────────────
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    const id = node ? String(node.id ?? '') : null;
    hoverIdRef.current = id;
    neighborIdsRef.current = id ? (adjacencyMap.get(id) ?? new Set()) : new Set();
    setHoverNode(node as FGNode | null);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  }, [adjacencyMap]);

  // ── Link hover ────────────────────────────────────────────────────────────
  const handleLinkHover = useCallback((link: object | null) => {
    const l = link as FGLink | null;
    hoverLinkRef.current = l;
    setHoverLink(l);
    if (containerRef.current) {
      containerRef.current.style.cursor = l ? 'crosshair' : 'default';
    }
  }, []);

  // ── Click → market detail ──────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: NodeObject) => {
    hoverIdRef.current = null;
    neighborIdsRef.current = new Set();
    hoverLinkRef.current = null;
    setHoverNode(null);
    setHoverLink(null);
    navigate(`/market/${node.id}`);
  }, [navigate]);

  // ── Custom node painter ────────────────────────────────────────────────────
  const paintNode = useCallback((
    node: NodeObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const n = node as FGNode;
    const { x = 0, y = 0 } = n;
    const color = clusterColor(n.group ?? 0);

    const hoverId = hoverIdRef.current;
    const isHovered  = String(n.id) === hoverId;
    const isNeighbor = !!hoverId && neighborIdsRef.current.has(String(n.id));
    const hasHover   = hoverId !== null;
    const isDimmed   = hasHover && !isHovered && !isNeighbor;

    // Degree-proportional radius — hub nodes visually larger
    const baseR = nodeRadius(n);
    const r     = isHovered ? NODE.radiusHover : baseR;
    const alpha = isDimmed ? NODE.alphaDimmed : isHovered ? NODE.alphaHover : NODE.alphaDefault;

    const t       = Date.now() / 4200 + (n.group ?? 0) * 0.18;
    const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

    ctx.save();

    if (!isDimmed) {
      const glowR = isHovered
        ? NODE.glowRadiusHover
        : isNeighbor
        ? NODE.glowRadiusDefault * 1.6
        : NODE.glowRadiusDefault;
      const baseGlowA = isHovered
        ? NODE.glowAlphaHover
        : isNeighbor
        ? NODE.glowAlphaDefault * 1.5
        : NODE.glowAlphaDefault;
      const glowA = baseGlowA * (0.78 + 0.44 * breathe);

      ctx.shadowColor = color;
      ctx.shadowBlur  = glowR;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, glowA * 0.35);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Core circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.fill();

    // Ring on hover
    if (isHovered) {
      ctx.strokeStyle = hexToRgba(color, NODE.ringAlpha);
      ctx.lineWidth = NODE.ringWidth / globalScale;
      ctx.stroke();
    }

    // Labels:
    // - always visible for hub nodes (high degree)
    // - always visible on hover or neighbor
    // - visible at moderate zoom (>1.6)
    const isHub = (n.degree ?? 0) >= NODE.hubDegree;
    const showLabel = !isDimmed && (isHub || isHovered || isNeighbor || globalScale > 0.8);

    if (showLabel) {
      const label    = truncate(n.title ?? '', NODE.labelMaxChars);
      const fontSize = isHovered
        ? Math.max(10 / globalScale, 4.5)
        : isHub
        ? Math.max(9.5 / globalScale, 4)
        : Math.max(8.5 / globalScale, 3.5);

      ctx.font         = `${isHovered || isHub ? 600 : 400} ${fontSize}px -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';

      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur  = 4;
      ctx.fillStyle   = hexToRgba('#e2e8f0', isHovered ? 0.97 : isHub ? 0.80 : 0.60);
      ctx.fillText(label, x, y + r + 2.5 / globalScale);
      ctx.shadowBlur  = 0;
    }

    ctx.restore();
  }, []);

  // ── Edge reason labels — rendered after the default link line ─────────────
  const paintLink = useCallback((link: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const l = link as FGLink;
    if (!l.reason) return;
    if (typeof l.source !== 'object' || typeof l.target !== 'object') return;

    const hoverId      = hoverIdRef.current;
    const isLinkHovered = hoverLinkRef.current === l;

    const src = resolveId(l.source);
    const tgt = resolveId(l.target);
    const connectedToNode = !!hoverId && (src === hoverId || tgt === hoverId);

    if (!connectedToNode && !isLinkHovered) return;

    const sNode = l.source as FGNode;
    const tNode = l.target as FGNode;
    const mx = ((sNode.x ?? 0) + (tNode.x ?? 0)) / 2;
    const my = ((sNode.y ?? 0) + (tNode.y ?? 0)) / 2;

    const text     = truncate(l.reason, 26);
    const fontSize = isLinkHovered
      ? Math.max(8.5 / globalScale, 3.5)
      : Math.max(7 / globalScale, 3);

    ctx.font         = `${isLinkHovered ? 600 : 400} ${fontSize}px -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tw  = ctx.measureText(text).width;
    const pad = 3 / globalScale;

    ctx.fillStyle = isLinkHovered ? 'rgba(8,11,18,0.92)' : 'rgba(8,11,18,0.75)';
    ctx.fillRect(mx - tw / 2 - pad, my - fontSize / 2 - pad, tw + pad * 2, fontSize + pad * 2);

    ctx.fillStyle = isLinkHovered ? 'rgba(226,232,240,0.95)' : 'rgba(226,232,240,0.62)';
    ctx.fillText(text, mx, my);
  }, []);

  // ── Link color / width ─────────────────────────────────────────────────────
  const getLinkColor = useCallback((link: object) => {
    const l       = link as FGLink;
    const src     = resolveId(l.source);
    const tgt     = resolveId(l.target);
    const hoverId = hoverIdRef.current;

    if (hoverLinkRef.current === l) return EDGE.colorHighlighted;

    if (!hoverId) {
      if (l.strength === 'strong')  return EDGE.colorStrong;
      if (l.strength === 'medium') return EDGE.colorMedium;
      return EDGE.colorWeak;
    }
    if (src === hoverId || tgt === hoverId) return EDGE.colorHighlighted;
    if (neighborIdsRef.current.has(src) && neighborIdsRef.current.has(tgt)) return EDGE.colorMedium;
    return EDGE.colorDimmed;
  }, []);

  const getLinkWidth = useCallback((link: object) => {
    const l       = link as FGLink;
    const src     = resolveId(l.source);
    const tgt     = resolveId(l.target);
    const hoverId = hoverIdRef.current;

    if (hoverLinkRef.current === l) return EDGE.widthHighlighted;
    if (hoverId && (src === hoverId || tgt === hoverId)) return EDGE.widthHighlighted;
    if (l.strength === 'strong')  return EDGE.widthStrong;
    if (l.strength === 'medium') return EDGE.widthMedium;
    return EDGE.widthWeak;
  }, []);

  // ── Node hit area (slightly larger than rendered circle) ────────────────────
  const paintNodeArea = useCallback((
    node: NodeObject,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => {
    const { x = 0, y = 0 } = node;
    const r = nodeRadius(node as FGNode);
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  // ── Link hit area — wide invisible stroke so edges are easy to hover ────────
  const paintLinkArea = useCallback((
    link: object,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => {
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

  // ── Top connections for tooltip (strongest 2 only) ──────────────────────────
  const topConnections = useMemo(() => {
    if (!hoverNode || !graphData) return [];
    const id = String(hoverNode.id);
    return graphData.edges
      .filter(e => e.source === id || e.target === id)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .flatMap(e => {
        const neighborId = e.source === id ? e.target : e.source;
        const neighbor = graphData.nodes.find(n => n.id === neighborId);
        return neighbor ? [{ title: neighbor.title, reason: e.reason }] : [];
      });
  }, [hoverNode, graphData]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const ready = !loading && !error && dims.w > 0;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {loading && (
        <div className="pg-center">
          <span style={{ color: 'var(--pg-accent)', fontSize: 12, opacity: 0.75 }}>
            Loading signal map…
          </span>
        </div>
      )}

      {!loading && error && (
        <div className="pg-center">
          <span style={{ color: 'var(--pg-text-muted)', fontSize: 12 }}>
            Could not load markets
          </span>
        </div>
      )}

      {ready && (
        <ForceGraph2D
          ref={fgRef as React.MutableRefObject<ForceGraphMethods>}
          width={dims.w}
          height={dims.h}
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
          d3AlphaDecay={FORCE.alphaDecay}
          d3VelocityDecay={FORCE.velocityDecay}
          enableNodeDrag={false}
          warmupTicks={150}
          cooldownTicks={Infinity}
          enableZoomInteraction
          enablePanInteraction
        />
      )}

      {/* HUD — compact top bar */}
      <div className="pg-hud">
        <div className="pg-hud__left">
          <span className="pg-logo">Puls<span>o</span></span>
          {ready && !hoverNode && !hoverLink && (
            <div className="pg-cluster-legend">
              {CLUSTER_LABELS.map((label, i) => (
                <div key={i} className="pg-cluster-legend__item">
                  <span
                    className="pg-cluster-legend__dot"
                    style={{ background: CLUSTER_COLORS[i] }}
                  />
                  <span className="pg-cluster-legend__label">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pg-hud__auth">
          <PasswordlessAuthWidget />
        </div>
      </div>

      {/* Edge hover tooltip */}
      {ready && !hoverNode && hoverLink && (() => {
        const src = typeof hoverLink.source === 'object' ? hoverLink.source as FGNode : null;
        const tgt = typeof hoverLink.target === 'object' ? hoverLink.target as FGNode : null;
        if (!src || !tgt || !hoverLink.reason) return null;
        const srcColor = clusterColor(src.group ?? 0);
        const tgtColor = clusterColor(tgt.group ?? 0);
        return (
          <div className="pg-tooltip pg-tooltip--edge" style={{ position: 'absolute', bottom: 24, left: 24 }}>
            <p className="pg-tooltip__edge-reason">"{hoverLink.reason}"</p>
            <hr className="pg-tooltip__divider" />
            <div className="pg-tooltip__edge-markets">
              <span className="pg-tooltip__edge-market" style={{ color: srcColor }}>
                {truncate(src.title, 26)}
              </span>
              <span className="pg-tooltip__edge-arrow">↔</span>
              <span className="pg-tooltip__edge-market" style={{ color: tgtColor }}>
                {truncate(tgt.title, 26)}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Node hover tooltip — bottom of screen */}
      {ready && hoverNode && (() => {
        const editorial = getEditorial(hoverNode.marketId);
        const clusterLabel = CLUSTER_LABELS[hoverNode.group ?? 0];
        const color = clusterColor(hoverNode.group ?? 0);
        return (
          <div
            className="pg-tooltip"
            style={{ position: 'absolute', bottom: 24, left: 24 }}
          >
            <span
              className="pg-tooltip__cluster-badge"
              style={{ borderColor: color, color }}
            >
              {clusterLabel}
            </span>
            <p className="pg-tooltip__title">{hoverNode.title}</p>
            {editorial && (
              <p className="pg-tooltip__explanation">{editorial.hoverExplanation}</p>
            )}
            {topConnections.length > 0 && (
              <>
                <hr className="pg-tooltip__divider" />
                <p className="pg-tooltip__links-label">Also moves with</p>
                {topConnections.map((c, i) => (
                  <div key={i} className="pg-tooltip__connection">
                    <span className="pg-tooltip__conn-label">{truncate(c.title, 28)}</span>
                    {c.reason && (
                      <span className="pg-tooltip__conn-reason">{truncate(c.reason, 30)}</span>
                    )}
                  </div>
                ))}
              </>
            )}
            <p className="pg-tooltip__cta">Click to explore this storyline →</p>
          </div>
        );
      })()}
    </div>
  );
}
