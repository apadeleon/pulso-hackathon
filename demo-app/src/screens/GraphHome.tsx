import React, {
  useState, useMemo, useCallback, useEffect,
} from 'react';
import { PasswordlessAuthWidget } from '@functionspace/ui';
import { useGraphData } from '../graph/useGraphData';
import { CLUSTER_LABELS, getEditorial } from '../graph/editorial';
import type { GraphNode, GraphEdge } from '../graph/types';
import { GraphSVG, DESIGN_COLORS } from '../components/GraphSVG';
import { IntroOverlay } from '../components/IntroOverlay';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEIGHT_MAP: Record<string, number> = { strong: 3, medium: 2, weak: 1 };

// Cluster short labels (matching design palette)
const CLUSTER_SHORTS = ['CORE', 'LEGACY', 'ATTENTION', 'TRAVEL'] as const;

// ─── Rail cover ───────────────────────────────────────────────────────────────

interface RailCoverProps {
  filterCluster: number | null;
  onFilterChange: (cluster: number | null) => void;
  onStartTour: () => void;
}

function RailCover({ filterCluster, onFilterChange, onStartTour }: RailCoverProps) {
  return (
    <>
      <div className="pg-cover__masthead">
        <div className="pg-cover__logo">
          Puls<span className="pg-cover__logo-dot"/>o
        </div>
        <div className="pg-cover__meta">
          <span className="pg-cover__meta-issue">Issue 01</span>
          <span className="pg-cover__meta-date">May 13, 2026 · 28 days to kickoff</span>
        </div>
      </div>

      <div className="pg-cover__eyebrow">The 2026 World Cup, as one connected market</div>

      <h1 className="pg-cover__headline">
        Fifteen markets. Four storylines. One tournament.
      </h1>

      <p className="pg-cover__deck">
        We don&rsquo;t think the right question is{' '}
        <em>which contract should I trade</em>. The right question is{' '}
        <em>which contracts move together — and why.</em>
      </p>

      <div className="pg-cover__byline">By the Pulso desk · Curated 13.05.2026</div>

      <div className="pg-cover__body">
        <p>
          Most market apps treat every contract as an island. A list, a chart, a buy
          button. The 2026 World Cup is not a list. It is a system. When Messi scores,
          four other markets re-price in the same second. When the USA reaches the round
          of 16, Mexico&rsquo;s flight market wakes up. The story is in the edges, not the nodes.
        </p>
        <p>
          What you are looking at is a hand-curated graph of fifteen World-Cup-adjacent
          markets, drawn so the relationships are the first thing you see. Four
          neighborhoods —{' '}
          <em>Core</em>, <em>Legacy</em>, <em>Attention</em>, and <em>Travel</em>{' '}
          — meet at the markets that bridge them.
        </p>
        <div className="pg-cover__pullquote">
          &ldquo;The story is in the edges, not the nodes.&rdquo;
        </div>
        <p>
          Hover any market to read the one-sentence reason it sits where it does.
          Click any market to open its story in this column. The graph never leaves
          your view.
        </p>
      </div>

      <div className="pg-cover__cta">
        <div className="pg-cover__cta-label">Start here</div>
        <div className="pg-cover__cta-body">
          New to the graph? Walk through the five keystone markets in order. About a minute.
        </div>
        <button
          className="pg-filter-chip pg-filter-chip--active"
          style={{ marginTop: 4 }}
          onClick={onStartTour}
        >
          Start the tour →
        </button>
      </div>

      <div className="pg-cover__filters">
        <div className="pg-cover__filters-label">Filter by storyline</div>
        <div className="pg-cover__filters-chips">
          <button
            className={'pg-filter-chip' + (filterCluster === null ? ' pg-filter-chip--active' : '')}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          {CLUSTER_LABELS.map((label, i) => (
            <button
              key={i}
              className={'pg-filter-chip' + (filterCluster === i ? ' pg-filter-chip--active' : '')}
              onClick={() => onFilterChange(filterCluster === i ? null : i)}
            >
              <span className="pg-filter-chip__dot" style={{ background: DESIGN_COLORS[i] }}/>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Rail story ───────────────────────────────────────────────────────────────

interface RailStoryProps {
  focusedNode: GraphNode;
  focusedConnections: Array<{ node: GraphNode; edge: GraphEdge }>;
  onClose: () => void;
  onConnectionClick: (id: string) => void;
  onConnectionHover: (id: string | null) => void;
}

function RailStory({
  focusedNode,
  focusedConnections,
  onClose,
  onConnectionClick,
  onConnectionHover,
}: RailStoryProps) {
  const editorial = getEditorial(focusedNode.marketId);
  const clusterLabel = CLUSTER_LABELS[focusedNode.group ?? 0];
  const clusterShort = CLUSTER_SHORTS[focusedNode.group as 0|1|2|3];
  const color = DESIGN_COLORS[focusedNode.group % 4];

  return (
    <>
      <div className="pg-story__header">
        <div className="pg-story__breadcrumb">
          <span>Pulso</span>
          <span className="pg-story__breadcrumb-sep">/</span>
          <span style={{ color }}>{clusterShort}</span>
        </div>
        <button className="pg-story__close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="pg-story__cluster-badge" style={{ color }}>
        <span className="pg-story__cluster-dot" style={{ background: color }}/>
        {clusterLabel}
      </div>

      <h1 className="pg-story__title">{focusedNode.title}</h1>

      {editorial && (
        <p className="pg-story__pull">{editorial.hoverExplanation}</p>
      )}

      {editorial && (
        <div className="pg-story__section">
          <div className="pg-story__section-label">Why it matters</div>
          <p className="pg-story__body">{editorial.whyItMatters}</p>
        </div>
      )}

      {editorial && (
        <div className="pg-story__section">
          <div className="pg-story__section-label">What&rsquo;s happening now</div>
          <p className="pg-story__body">{editorial.nowContext}</p>
        </div>
      )}

      <div className="pg-story__section">
        <div className="pg-story__section-label">
          Why this connects ({focusedConnections.length})
        </div>
        <div className="pg-conns">
          {focusedConnections.map(({ node: other, edge }, i) => {
            const otherColor = DESIGN_COLORS[other.group % 4];
            return (
              <div
                key={other.id}
                className="pg-conn"
                onMouseEnter={() => onConnectionHover(other.id)}
                onMouseLeave={() => onConnectionHover(null)}
                onClick={() => { onConnectionHover(null); onConnectionClick(other.id); }}
              >
                <span className="pg-conn__num">0{i + 1}</span>
                <span className="pg-conn__title">{other.title}</span>
                <span className="pg-conn__dot" style={{ background: otherColor }}/>
                <p className="pg-conn__reason">&ldquo;{edge.reason}&rdquo;</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pg-story__section">
        <div className="pg-story__section-label">Take a view</div>
        <div className="pg-story__take-prompt">
          <span className="pg-story__take-prompt-dot"/>
          <span>
            Build your call using the{' '}
            <em>floating card on the map</em>{' '}
            — then place it solo or add it to your combo.
          </span>
        </div>
      </div>
    </>
  );
}

// ─── GraphHome ────────────────────────────────────────────────────────────────

export function GraphHome() {
  const { graphData, loading, error } = useGraphData();

  const [introOpen, setIntroOpen] = useState(true);
  const [introStage, setIntroStage] = useState(0);
  const effectiveStage = introOpen ? introStage : 3;

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [filterCluster, setFilterCluster] = useState<number | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);

  const handleIntroDone = useCallback(() => {
    setIntroOpen(false);
    setIntroStage(3);
  }, []);

  // ── Focused node + connections ─────────────────────────────────────────
  const focusedNode = useMemo<GraphNode | null>(() => {
    if (!focusedId || !graphData) return null;
    return graphData.nodes.find(n => n.id === focusedId) ?? null;
  }, [focusedId, graphData]);

  const focusedConnections = useMemo<Array<{ node: GraphNode; edge: GraphEdge }>>(() => {
    if (!focusedId || !graphData) return [];
    const results: Array<{ node: GraphNode; edge: GraphEdge }> = [];
    for (const e of graphData.edges) {
      const isSource = e.source === focusedId;
      const isTarget = e.target === focusedId;
      if (isSource || isTarget) {
        const otherId = isSource ? e.target : e.source;
        const other = graphData.nodes.find(n => n.id === otherId);
        if (other) results.push({ node: other, edge: e });
      }
    }
    return results.sort(
      (a, b) => (WEIGHT_MAP[b.edge.strength] ?? 0) - (WEIGHT_MAP[a.edge.strength] ?? 0),
    );
  }, [focusedId, graphData]);

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFocusedId(null); setHoveredConnId(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    setHoveredConnId(null);
    setFocusedId(id);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setFocusedId(null);
    setHoveredConnId(null);
  }, []);

  return (
    <div className={`pg-shell${introOpen ? ' pg-shell--intro' : ''}`}>

      {/* ── Masthead ── */}
      <header className="pg-masthead">
        <div className="pg-masthead__left">
          <div className="pg-wordmark">
            Puls<span className="pg-wordmark__dot"/>o
          </div>
          <div className="pg-masthead__sep"/>
          <div className="pg-masthead__issue">
            Issue 01 · <b>The 2026 World Cup</b>
          </div>
        </div>
        <div className="pg-masthead__right">
          <span className="pg-live-dot"/>
          <span>28 days to kickoff</span>
          <span className="pg-masthead__dot-sep">·</span>
          <span>15 markets · 29 edges</span>
          <div className="pg-masthead__auth">
            <PasswordlessAuthWidget />
          </div>
        </div>
      </header>

      {/* ── Canvas ── */}
      <div className="pg-canvas-wrap" data-intro={introOpen ? 'true' : 'false'}>
        {/* Subtle grid texture */}
        <div className="pg-canvas-grid" style={{ zIndex: 2 }}/>

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

        {!loading && !error && (
          <GraphSVG
            graphData={graphData}
            focusedId={focusedId}
            filterCluster={filterCluster}
            hoveredConnId={hoveredConnId}
            introStage={effectiveStage}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
          />
        )}

        {introOpen && (
          <IntroOverlay
            onStageChange={setIntroStage}
            onDone={handleIntroDone}
          />
        )}

        {/* Cluster legend — hidden when focused or during intro */}
        {!introOpen && !loading && !error && !focusedId && (
          <div className="pg-cluster-legend" style={{ zIndex: 3 }}>
            {CLUSTER_LABELS.map((label, i) => (
              <div key={i} className="pg-cluster-legend__item">
                <span
                  className="pg-cluster-legend__dot"
                  style={{ background: DESIGN_COLORS[i] }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Edge-type key — hidden when focused or during intro */}
        {!introOpen && !loading && !error && !focusedId && (
          <div className="pg-edge-key" style={{ zIndex: 3 }}>
            <div className="pg-edge-key__title">How to read</div>
            <div className="pg-edge-key__row">
              <svg className="pg-edge-key__sample" viewBox="0 0 44 10">
                <defs>
                  <marker id="k-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="rgba(230,236,247,0.85)"/>
                  </marker>
                </defs>
                <line x1="2" y1="5" x2="36" y2="5" stroke="rgba(230,236,247,0.7)" strokeWidth="1.6" markerEnd="url(#k-arrow)"/>
              </svg>
              <span>Causes</span>
            </div>
            <div className="pg-edge-key__row">
              <svg className="pg-edge-key__sample" viewBox="0 0 44 10">
                <line x1="2" y1="5" x2="42" y2="5" stroke="rgba(230,236,247,0.7)" strokeWidth="1.6"/>
              </svg>
              <span>Same driver</span>
            </div>
            <div className="pg-edge-key__row">
              <svg className="pg-edge-key__sample" viewBox="0 0 44 10">
                <line x1="2" y1="5" x2="42" y2="5" stroke="rgba(230,236,247,0.7)" strokeWidth="1.6" strokeDasharray="5 4"/>
              </svg>
              <span>Spills over</span>
            </div>
            <div className="pg-edge-key__row">
              <svg className="pg-edge-key__sample" viewBox="0 0 44 10">
                <line x1="2" y1="3" x2="42" y2="3" stroke="rgba(230,236,247,0.7)" strokeWidth="1.4"/>
                <line x1="2" y1="7" x2="42" y2="7" stroke="rgba(230,236,247,0.45)" strokeWidth="1"/>
              </svg>
              <span>Amplifies</span>
            </div>
            <div className="pg-edge-key__strengths">
              <span className="pg-edge-key__strengths-label">Weight</span>
              <span className="pg-edge-key__bar pg-edge-key__bar--weak"/>
              <span className="pg-edge-key__bar pg-edge-key__bar--med"/>
              <span className="pg-edge-key__bar"/>
            </div>
          </div>
        )}

        {/* Map card — shown when a node is focused, never during intro */}
        {!introOpen && !loading && !error && focusedId && focusedNode && (
          <div className="pg-map-card" style={{ zIndex: 4 }}>
            <div className="pg-map-card__stripe"/>
            <div className="pg-map-card__header">
              <div>
                <div
                  className="pg-map-card__cluster"
                  style={{ color: DESIGN_COLORS[focusedNode.group % 4] }}
                >
                  <span
                    className="pg-map-card__cluster-dot"
                    style={{ background: DESIGN_COLORS[focusedNode.group % 4] }}
                  />
                  {CLUSTER_LABELS[focusedNode.group ?? 0]}
                </div>
                <h2 className="pg-map-card__title">{focusedNode.title}</h2>
              </div>
              <button
                className="pg-map-card__close"
                onClick={() => { setFocusedId(null); setHoveredConnId(null); }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="pg-map-card__section-label">Take a view</div>
            <div className="pg-map-card__body">
              <p className="pg-take__prompt">
                Build your call on this market. <em>Trading coming soon.</em>
              </p>
              <div className="pg-take__sides">
                <button className="pg-take__side pg-take__side--pos">
                  <span className="pg-take__side-arrow">↑</span>
                  <span className="pg-take__side-label">Higher</span>
                  <span className="pg-take__side-sub">Over consensus</span>
                </button>
                <button className="pg-take__side pg-take__side--neg">
                  <span className="pg-take__side-arrow">↓</span>
                  <span className="pg-take__side-label">Lower</span>
                  <span className="pg-take__side-sub">Under consensus</span>
                </button>
              </div>
              <p className="pg-take__footer">No positions yet</p>

              {focusedConnections.length > 0 && (
                <div className="pg-map-card__next">
                  <div className="pg-map-card__next-head">
                    <div className="pg-map-card__next-label">Moves with</div>
                  </div>
                  <div className="pg-map-card__next-list">
                    {focusedConnections.slice(0, 3).map(({ node: other, edge }) => (
                      <div
                        key={other.id}
                        className="pg-map-card__next-row"
                        onMouseEnter={() => setHoveredConnId(other.id)}
                        onMouseLeave={() => setHoveredConnId(null)}
                        onClick={() => { setHoveredConnId(null); setFocusedId(other.id); }}
                      >
                        <span
                          className="pg-map-card__next-dot"
                          style={{ background: DESIGN_COLORS[other.group % 4] }}
                        />
                        <div className="pg-map-card__next-text">
                          <div className="pg-map-card__next-title">{other.title}</div>
                          <div className="pg-map-card__next-reason">&ldquo;{edge.reason}&rdquo;</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer hint — hidden during intro */}
        {!introOpen && !loading && !error && (
          <div className="pg-canvas-hint" style={{ zIndex: 3 }}>
            {focusedId ? (
              <span><kbd>Esc</kbd> back to cover · click background to close</span>
            ) : (
              <span>Hover a market to read · click to open story</span>
            )}
          </div>
        )}
      </div>

      {/* ── Rail — hidden during intro ── */}
      {!introOpen && <aside className="pg-rail">
        <div className="pg-rail__scroll">
          {focusedId && focusedNode ? (
            <RailStory
              focusedNode={focusedNode}
              focusedConnections={focusedConnections}
              onClose={() => { setFocusedId(null); setHoveredConnId(null); }}
              onConnectionClick={(id) => { setHoveredConnId(null); setFocusedId(id); }}
              onConnectionHover={setHoveredConnId}
            />
          ) : (
            <RailCover
              filterCluster={filterCluster}
              onFilterChange={setFilterCluster}
              onStartTour={() => setFocusedId('129')}
            />
          )}
        </div>
      </aside>}

    </div>
  );
}
