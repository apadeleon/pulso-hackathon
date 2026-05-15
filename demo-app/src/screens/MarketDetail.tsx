import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MarketStats,
  PositionTable,
  TimeSales,
  PasswordlessAuthWidget,
} from '@functionspace/ui';
import { MiniSubgraph } from '../MiniSubgraph';
import { ClusterCrowdRead } from '../components/ClusterCrowdRead';
import { useMarket } from '@functionspace/react';
import { useGraphData } from '../graph/useGraphData';
import { CLUSTER_LABELS, CLUSTER_DESCRIPTIONS, getEditorial } from '../graph/editorial';
import { clusterColor } from '../graph/theme';
import type { GraphNode, GraphEdge } from '../graph/types';

// ─── Related markets hook ─────────────────────────────────────────────────────

interface RelatedEntry {
  node: GraphNode;
  edge: GraphEdge;
}

function useRelatedMarkets(marketId: string): RelatedEntry[] {
  const { graphData } = useGraphData();

  return useMemo(() => {
    if (!graphData) return [];

    const edges = graphData.edges
      .filter(e => e.source === marketId || e.target === marketId)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4);

    const results: RelatedEntry[] = [];
    for (const edge of edges) {
      const neighborId = edge.source === marketId ? edge.target : edge.source;
      const node = graphData.nodes.find(n => n.id === neighborId);
      if (node) results.push({ node, edge });
    }
    return results;
  }, [graphData, marketId]);
}

// ─── Consensus callout ────────────────────────────────────────────────────────

interface ConsensusCalloutProps {
  mean: number;
  units: string;
  lowerBound: number;
  upperBound: number;
}

function ConsensusCallout({ mean, units, lowerBound, upperBound }: ConsensusCalloutProps) {
  const pct = ((mean - lowerBound) / (upperBound - lowerBound)) * 100;
  const clampedPct = Math.min(Math.max(pct, 2), 98);

  return (
    <div className="pg-consensus-callout">
      <p className="pg-consensus-callout__label">Current crowd expectation</p>
      <p className="pg-consensus-callout__value">
        {Number.isInteger(mean) ? mean.toString() : mean.toFixed(1)}
        {units ? <span className="pg-consensus-callout__units"> {units}</span> : null}
      </p>
      <div className="pg-consensus-callout__bar-track">
        <div
          className="pg-consensus-callout__bar-fill"
          style={{ width: `${clampedPct}%` }}
        />
        <div
          className="pg-consensus-callout__bar-marker"
          style={{ left: `${clampedPct}%` }}
        />
      </div>
      <div className="pg-consensus-callout__bounds">
        <span>{lowerBound} {units}</span>
        <span>{upperBound} {units}</span>
      </div>
    </div>
  );
}

// ─── MarketDetail ─────────────────────────────────────────────────────────────

export function MarketDetail() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();

  const id = marketId ?? '';
  const numericId = Number(id);

  const { market, loading, error } = useMarket(numericId);
  const { graphData } = useGraphData();
  const related = useRelatedMarkets(id);

  const graphNode = useMemo(
    () => graphData?.nodes.find(n => n.id === id) ?? null,
    [graphData, id],
  );

  if (!id || isNaN(numericId)) {
    return (
      <div className="pg-detail pg-center">
        <span style={{ color: 'var(--pg-text-muted)', fontSize: 13 }}>Invalid market</span>
        <button className="pg-back-btn" onClick={() => navigate('/')}>← Back to graph</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pg-detail pg-center">
        <span style={{ color: 'var(--pg-accent)', fontSize: 12, opacity: 0.75 }}>
          Loading market…
        </span>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="pg-detail pg-center">
        <span style={{ color: 'var(--pg-text-muted)', fontSize: 13 }}>Market not found</span>
        <button className="pg-back-btn" onClick={() => navigate('/')}>← Back to graph</button>
      </div>
    );
  }

  const editorial = getEditorial(numericId);
  const clusterIndex = graphNode?.group ?? 0;
  const clusterLabel = CLUSTER_LABELS[clusterIndex];
  const clusterDesc = CLUSTER_DESCRIPTIONS[clusterIndex];
  const color = clusterColor(clusterIndex);

  const { lowerBound, upperBound } = market.config;
  const consensusMean = market.consensusMean ?? (lowerBound + upperBound) / 2;

  return (
    <div className="pg-detail">

      {/* Sticky header */}
      <div className="pg-detail__header">
        <button className="pg-back-btn" onClick={() => navigate('/')}>← Graph</button>
        <div className="pg-masthead__auth"><PasswordlessAuthWidget /></div>
      </div>

      {/* Scrollable body */}
      <div className="pg-detail__body">

        {/* ── Section 1: Editorial hero ────────────────────────── */}
        <div className="pg-hero">
          <span className="pg-hero__badge" style={{ borderColor: color, color }}>
            {clusterLabel}
          </span>
          <h1 className="pg-hero__title">{market.title}</h1>
          {editorial ? (
            <>
              <p className="pg-hero__why">{editorial.whyItMatters}</p>
              <p className="pg-hero__now">{editorial.nowContext}</p>
            </>
          ) : (
            <p className="pg-hero__why">{clusterDesc}</p>
          )}
        </div>

        {/* ── Section: Market stats ────────────────────────────── */}
        <div className="pg-section pg-section--stats">
          <MarketStats marketId={numericId} />
        </div>

        {/* ── Section: Your positions ──────────────────────────── */}
        <div className="pg-section">
          <p className="pg-section__label">Your bets</p>
          <PositionTable
            marketId={numericId}
            tabs={['open-orders', 'market-positions']}
            pageSize={5}
          />
        </div>

        {/* ── Section: Crowd read ──────────────────────────────── */}
        <div className="pg-section">
          <p className="pg-section__label">Crowd read</p>
          {editorial && (
            <p className="pg-crowd-summary">{editorial.crowdSummary}</p>
          )}
          <ConsensusCallout
            mean={consensusMean}
            units={market.xAxisUnits ?? ''}
            lowerBound={lowerBound}
            upperBound={upperBound}
          />
        </div>

        {/* ── Section: Cluster crowd read ──────────────────────── */}
        <ClusterCrowdRead
          clusterIndex={clusterIndex}
          currentMarketId={numericId}
        />

        {/* ── Section 4: Why it connects ───────────────────────── */}
        {graphData && (
          <div className="pg-section">
            <p className="pg-section__label">Why it connects</p>
            <MiniSubgraph
              key={id}
              centerNodeId={id}
              graphData={graphData}
              height={260}
            />
            {related.length > 0 && (
              <div className="pg-edge-reasons">
                {related.slice(0, 3).map(entry => (
                  <div key={entry.node.id} className="pg-edge-reason">
                    <span className="pg-edge-reason__name">{entry.node.title}</span>
                    <span className="pg-edge-reason__text">{entry.edge.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Section 5: Recent bets ───────────────────────────── */}
        <div className="pg-section">
          <p className="pg-section__label">Recent bets</p>
          <TimeSales
            marketId={numericId}
            limit={20}
            pollInterval={5000}
            maxHeight="280px"
            emptyMessage="No bets on this market yet"
          />
        </div>


      </div>
    </div>
  );
}
