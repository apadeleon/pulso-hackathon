import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { MARKET_CLUSTER, getEnglishTitle } from '../graph/normalize';
import { CLUSTER_LABELS } from '../graph/editorial';
import { clusterColor } from '../graph/theme';

interface ClusterCrowdReadProps {
  clusterIndex: number;
  currentMarketId: number;
}

interface PeerRow {
  marketId: number;
  title: string;
  leanPct: number;
  meanLabel: string;
  units: string;
  volume: number;
}

function formatCompactUSD(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function buildPeer(m: MarketState): PeerRow {
  const { lowerBound, upperBound } = m.config;
  const mean = m.consensusMean ?? (lowerBound + upperBound) / 2;
  const span = Math.max(upperBound - lowerBound, 1e-9);
  const leanPct = Math.min(Math.max(((mean - lowerBound) / span) * 100, 2), 98);
  const meanLabel = Number.isInteger(mean) ? mean.toString() : mean.toFixed(1);
  return {
    marketId: m.marketId,
    title: getEnglishTitle(m.marketId, m.title),
    leanPct,
    meanLabel,
    units: m.xAxisUnits ?? '',
    volume: m.totalVolume ?? 0,
  };
}

export function ClusterCrowdRead({ clusterIndex, currentMarketId }: ClusterCrowdReadProps) {
  const navigate = useNavigate();
  const { markets } = useMarkets({ state: 'open' });

  const hasPeers = useMemo(
    () =>
      Object.entries(MARKET_CLUSTER).some(
        ([id, c]) => c === clusterIndex && Number(id) !== currentMarketId,
      ),
    [clusterIndex, currentMarketId],
  );

  const { peers, totals } = useMemo(() => {
    const inCluster = (markets ?? []).filter(
      m => MARKET_CLUSTER[m.marketId] === clusterIndex,
    );

    const totalVolume = inCluster.reduce((acc, m) => acc + (m.totalVolume ?? 0), 0);
    const totalParticipants = inCluster.reduce(
      (acc, m) => acc + (m.participantCount ?? 0),
      0,
    );

    const peerRows = inCluster
      .filter(m => m.marketId !== currentMarketId)
      .map(buildPeer)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return {
      peers: peerRows,
      totals: {
        count: inCluster.length,
        volume: totalVolume,
        participants: totalParticipants,
      },
    };
  }, [markets, clusterIndex, currentMarketId]);

  if (!hasPeers || totals.count === 0 || peers.length === 0) return null;

  const color = clusterColor(clusterIndex);
  const label = CLUSTER_LABELS[clusterIndex] ?? 'Cluster';

  return (
    <div className="pg-section">
      <p className="pg-section__label">Cluster crowd read</p>
      <p className="pg-section__hint">
        How this market sits inside the {label} cluster — peers ranked by volume.
      </p>
      <div className="pg-cluster-crowd">
        <div className="pg-cluster-crowd__head">
          <span className="pg-cluster-crowd__badge" style={{ borderColor: color, color }}>
            {label}
          </span>
          <div className="pg-cluster-crowd__stats">
            <div className="pg-cluster-crowd__stat">
              <span className="pg-cluster-crowd__stat-value">{totals.count}</span>
              <span className="pg-cluster-crowd__stat-label">markets</span>
            </div>
            <div className="pg-cluster-crowd__stat">
              <span className="pg-cluster-crowd__stat-value">{formatCompactUSD(totals.volume)}</span>
              <span className="pg-cluster-crowd__stat-label">cluster volume</span>
            </div>
            <div className="pg-cluster-crowd__stat">
              <span className="pg-cluster-crowd__stat-value">{formatCount(totals.participants)}</span>
              <span className="pg-cluster-crowd__stat-label">bettors</span>
            </div>
          </div>
        </div>

        <ul className="pg-cluster-crowd__peers">
          {peers.map(peer => (
            <li key={peer.marketId}>
              <button
                type="button"
                className="pg-cluster-crowd__peer"
                onClick={() => navigate(`/market/${peer.marketId}`)}
              >
                <span className="pg-cluster-crowd__peer-title">{peer.title}</span>
                <div className="pg-cluster-crowd__peer-bar">
                  <div
                    className="pg-cluster-crowd__peer-bar-fill"
                    style={{ width: `${peer.leanPct}%`, background: color }}
                  />
                  <div
                    className="pg-cluster-crowd__peer-bar-marker"
                    style={{ left: `${peer.leanPct}%`, background: color }}
                  />
                </div>
                <span className="pg-cluster-crowd__peer-meta">
                  <span className="pg-cluster-crowd__peer-mean">
                    {peer.meanLabel}
                    {peer.units ? <span className="pg-cluster-crowd__peer-units"> {peer.units}</span> : null}
                  </span>
                  <span className="pg-cluster-crowd__peer-volume">
                    {formatCompactUSD(peer.volume)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
