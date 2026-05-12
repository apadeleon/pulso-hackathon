import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MarketCharts,
  BinaryPanel,
  BucketTradePanel,
  PositionTable,
  TimeSales,
  PasswordlessAuthWidget,
} from '@functionspace/ui';
import { MiniSubgraph } from '../MiniSubgraph';
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

// ─── Trade mode switcher ──────────────────────────────────────────────────────

type TradeMode = 'binary' | 'bucket';

interface TradeModeOption {
  key: TradeMode;
  label: string;
  description: string;
}

const TRADE_MODES: TradeModeOption[] = [
  {
    key: 'binary',
    label: 'Quick call',
    description: 'Above or below the crowd expectation',
  },
  {
    key: 'bucket',
    label: 'Pick a zone',
    description: 'Select the range where you think it lands',
  },
];

// ─── MarketDetail ─────────────────────────────────────────────────────────────

export function MarketDetail() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();

  const id = marketId ?? '';
  const numericId = Number(id);

  const { market, loading, error } = useMarket(numericId);
  const { graphData } = useGraphData();
  const related = useRelatedMarkets(id);

  const [tradeMode, setTradeMode] = useState<TradeMode>('binary');

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
        <PasswordlessAuthWidget />
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

        {/* ── Section 2: Crowd read ────────────────────────────── */}
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
          <MarketCharts
            marketId={numericId}
            height={200}
            views={['consensus', 'timeline']}
            zoomable
          />
        </div>

        {/* ── Section 3: Make your call ────────────────────────── */}
        <div className="pg-section">
          <p className="pg-section__label">Make your call</p>
          <div className="pg-trade-tabs">
            {TRADE_MODES.map(mode => (
              <button
                key={mode.key}
                className={`pg-trade-tab${tradeMode === mode.key ? ' pg-trade-tab--active' : ''}`}
                onClick={() => setTradeMode(mode.key)}
              >
                <span className="pg-trade-tab__name">{mode.label}</span>
                <span className="pg-trade-tab__desc">{mode.description}</span>
              </button>
            ))}
          </div>

          {tradeMode === 'binary' && (
            <div className="pg-trade-panel-wrap">
              <p className="pg-section__hint">
                The crowd expects {Number.isInteger(consensusMean) ? consensusMean : consensusMean.toFixed(1)}{market.xAxisUnits ? ` ${market.xAxisUnits}` : ''}. Do you agree?
              </p>
              <BinaryPanel
                marketId={numericId}
                xPoint={{ mode: 'dynamic-mean', allowOverride: true }}
              />
            </div>
          )}

          {tradeMode === 'bucket' && (
            <div className="pg-trade-panel-wrap">
              <p className="pg-section__hint">
                Click the zone where you think this market will settle.
              </p>
              <BucketTradePanel
                marketId={numericId}
                defaultBucketCount={8}
                chartHeight={150}
                maxSelections={2}
              />
            </div>
          )}
        </div>

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

        {/* ── Section 5: Your activity ─────────────────────────── */}
        <div className="pg-section">
          <div className="pg-activity-sub">
            <p className="pg-section__label">Recent bets</p>
            <TimeSales
              marketId={numericId}
              limit={20}
              pollInterval={5000}
              maxHeight="280px"
              emptyMessage="No bets on this market yet"
            />
          </div>
          <div className="pg-activity-sub">
            <p className="pg-section__label">Your bets</p>
            <PositionTable
              marketId={numericId}
              tabs={['open-orders', 'market-positions']}
              pageSize={5}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
