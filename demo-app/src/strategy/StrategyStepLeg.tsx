import React, { useEffect, useRef } from 'react';
import { useMarket, usePreviewPayout } from '@functionspace/react';
import { ConsensusChart } from '@functionspace/ui';
import { computeDirectionBelief } from './belief';
import { useStrategy } from './StrategyContext';
import type { StrategyLeg } from './StrategyContext';

interface StrategyStepLegProps {
  leg: StrategyLeg;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
}

const AMOUNT_PRESETS = [5, 10, 25];

export function StrategyStepLeg({ leg, stepIndex, totalSteps, onNext, onBack }: StrategyStepLegProps) {
  const { setDirection, setCollateral, setBelief, setPayoutPreview } = useStrategy();
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
        // ignore — retries on next change
      }
    }, 200);
    // No cleanup on unmount — let the inflight fetch complete even after the user
    // navigates to the review step so the summary sees the preview data.
    // The clearTimeout above cancels any previous timer when params change.
  }, [leg.belief, leg.collateral, leg.marketId, previewFn, setPayoutPreview]);

  const mean = market?.consensusMean ?? null;
  const units = market?.xAxisUnits ?? '';
  const lowerBound = market?.config.lowerBound ?? 0;
  const upperBound = market?.config.upperBound ?? 100;
  const meanDisplay = mean !== null
    ? `${Number.isInteger(mean) ? mean : mean.toFixed(1)}${units ? ` ${units}` : ''}`
    : '—';

  return (
    <>
      {/* Scrollable content */}
      <div className="pg-step-scroll">
        <div className="pg-step-dots">
          {Array.from({ length: totalSteps + 1 }).map((_, i) => (
            <div
              key={i}
              className={`pg-step-dot${i === stepIndex ? ' pg-step-dot--active' : i < stepIndex ? ' pg-step-dot--done' : ''}`}
            />
          ))}
        </div>
        <p className="pg-step-label">Market {stepIndex + 1} of {totalSteps}</p>

        <h2 className="pg-step-title">{leg.title}</h2>

        {loading ? (
          <p className="pg-step-loading">Loading market…</p>
        ) : mean !== null ? (
          <div className="pg-step-consensus">
            <span className="pg-step-consensus__label">Crowd expects</span>
            <span className="pg-step-consensus__value">{meanDisplay}</span>
            <span className="pg-step-consensus__range">Range: {lowerBound}–{upperBound}{units ? ` ${units}` : ''}</span>
          </div>
        ) : null}

        {/* Direction first — primary action, visible without scrolling */}
        <div className="pg-step-directions">
          <button
            className={`pg-dir-btn${leg.direction === 'lower' ? ' pg-dir-btn--active pg-dir-btn--lower' : ''}`}
            onClick={() => setDirection(leg.marketId, 'lower')}
            disabled={loading || !market}
          >
            <span className="pg-dir-btn__arrow">↓</span>
            <span className="pg-dir-btn__label">Lower</span>
            <span className="pg-dir-btn__sub">Below {meanDisplay}</span>
          </button>
          <button
            className={`pg-dir-btn${leg.direction === 'higher' ? ' pg-dir-btn--active pg-dir-btn--higher' : ''}`}
            onClick={() => setDirection(leg.marketId, 'higher')}
            disabled={loading || !market}
          >
            <span className="pg-dir-btn__arrow">↑</span>
            <span className="pg-dir-btn__label">Higher</span>
            <span className="pg-dir-btn__sub">Above {meanDisplay}</span>
          </button>
        </div>

        {/* Keep the consensus chart below the primary controls so the step opens with
            the directional choice and amount visible without scrolling. */}
        {!loading && market && (
          <div className="pg-step-chart">
            <ConsensusChart marketId={leg.marketId} height={140} />
          </div>
        )}

        <div className="pg-step-amount">
          <span className="pg-step-amount__label">Bet amount</span>
          <div className="pg-step-amount__row">
            <div className="pg-step-amount__presets">
              {AMOUNT_PRESETS.map(p => (
                <button
                  key={p}
                  className={`pg-amount-preset${leg.collateral === p ? ' pg-amount-preset--active' : ''}`}
                  onClick={() => setCollateral(leg.marketId, p)}
                >${p}</button>
              ))}
            </div>
            <input
              type="number"
              className="pg-amount-input"
              min={1}
              step={1}
              value={leg.collateral}
              onChange={e => {
                const val = Number(e.target.value);
                if (val > 0) setCollateral(leg.marketId, val);
              }}
            />
          </div>
        </div>

        {leg.direction && (
          <p className="pg-step-preview">
            {!leg.belief ? 'Computing…'
              : !leg.payoutPreview ? 'Previewing…'
              : `If correct: up to $${leg.payoutPreview.maxPayout.toFixed(2)}`}
          </p>
        )}
      </div>

      {/* Pinned nav footer */}
      <div className="pg-step-nav">
        <button className="pg-step-nav__back" onClick={onBack}>← Back</button>
        <button
          className="pg-step-nav__next"
          onClick={onNext}
          disabled={!leg.direction}
        >
          {stepIndex === totalSteps - 1 ? 'Review →' : 'Next →'}
        </button>
      </div>
    </>
  );
}
