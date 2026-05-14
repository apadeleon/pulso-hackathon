import React, { useEffect, useRef } from 'react';
import { useMarket, usePreviewPayout } from '@functionspace/react';
import { computeDirectionBelief } from './belief';
import { useStrategy } from './StrategyContext';
import type { StrategyLeg } from './StrategyContext';

interface StrategyLegCardProps {
  leg: StrategyLeg;
}

export function StrategyLegCard({ leg }: StrategyLegCardProps) {
  const { removeByMarket, setDirection, setCollateral, setBelief, setPayoutPreview } = useStrategy();
  const { market, loading } = useMarket(leg.marketId);
  const { execute: previewFn } = usePreviewPayout(leg.marketId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!market || !leg.direction) return;
    const belief = computeDirectionBelief(market, leg.direction);
    setBelief(leg.marketId, belief);
  }, [market, leg.direction, leg.marketId, setBelief]);

  useEffect(() => {
    if (!leg.belief || leg.collateral <= 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const curve = await previewFn(leg.belief!, leg.collateral);
        setPayoutPreview(leg.marketId, curve);
      } catch {
        // ignore — preview retries on next change
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [leg.belief, leg.collateral, leg.marketId, previewFn, setPayoutPreview]);

  const lowerBound = market?.config.lowerBound ?? 0;
  const upperBound = market?.config.upperBound ?? 100;
  const mean = market?.consensusMean ?? null;
  const units = market?.xAxisUnits ?? '';
  const incomplete = !leg.direction || leg.collateral <= 0;

  return (
    <div className={`pg-leg-card${incomplete ? ' pg-leg-card--incomplete' : ''}`}>
      <div className="pg-leg-card__header">
        <span className="pg-leg-card__title">{leg.title}</span>
        <button
          className="pg-leg-card__remove"
          onClick={() => removeByMarket(leg.marketId)}
          title="Remove from combo"
        >×</button>
      </div>

      <p className="pg-leg-card__consensus">
        {loading ? 'Loading market…' : mean !== null
          ? <>Market expects: <strong>{mean.toFixed(1)} {units}</strong> (range {lowerBound}–{upperBound})</>
          : 'Market data unavailable'
        }
      </p>

      <div className="pg-leg-card__directions">
        <button
          className={`pg-direction-btn${leg.direction === 'lower' ? ' pg-direction-btn--active' : ''}`}
          onClick={() => setDirection(leg.marketId, 'lower')}
          disabled={loading || !market}
        >← Lower</button>
        <button
          className={`pg-direction-btn${leg.direction === 'higher' ? ' pg-direction-btn--active' : ''}`}
          onClick={() => setDirection(leg.marketId, 'higher')}
          disabled={loading || !market}
        >Higher →</button>
      </div>

      <div className="pg-leg-card__collateral">
        <span className="pg-leg-card__collateral-label">Bet amount $</span>
        <input
          type="number"
          className="pg-leg-card__collateral-input"
          min={1}
          step={1}
          value={leg.collateral}
          onChange={e => {
            const val = Number(e.target.value);
            if (val > 0) setCollateral(leg.marketId, val);
          }}
        />
      </div>

      <div className={`pg-leg-card__preview${leg.payoutPreview ? ' pg-leg-card__preview--loaded' : ''}`}>
        {!leg.direction && 'Choose a direction to see payout'}
        {leg.direction && !leg.belief && 'Computing…'}
        {leg.direction && leg.belief && !leg.payoutPreview && 'Previewing…'}
        {leg.payoutPreview && (
          <>Max payout: <strong>${leg.payoutPreview.maxPayout.toFixed(2)}</strong></>
        )}
      </div>
    </div>
  );
}
