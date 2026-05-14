import React, { useEffect } from 'react';
import { useMarket } from '@functionspace/react';
import { computeDirectionBelief } from './belief';
import { estimateLocalPayout } from './estimatePayout';
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

  useEffect(() => {
    if (!market || !leg.direction) return;
    const belief = computeDirectionBelief(market, leg.direction);
    setBelief(leg.marketId, belief);
  }, [market, leg.direction, leg.marketId, setBelief]);

  useEffect(() => {
    if (!market || !leg.direction || leg.collateral <= 0) return;
    const curve = estimateLocalPayout(market, leg.direction, leg.collateral);
    setPayoutPreview(leg.marketId, curve);
  }, [market, leg.direction, leg.collateral, leg.marketId, setPayoutPreview]);

  const mean = market?.consensusMean ?? null;
  const units = market?.xAxisUnits ?? '';
  const lowerBound = market?.config.lowerBound ?? 0;
  const upperBound = market?.config.upperBound ?? 100;
  const meanDisplay = mean !== null
    ? `${Number.isInteger(mean) ? mean : mean.toFixed(1)}${units ? ` ${units}` : ''}`
    : '—';

  return (
    <>
      <div className="pg-step-scroll pg-step-scroll--compact">
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

        <div className="pg-step-call">
          <p className="pg-take__prompt">
            Do you think this finishes <em>higher than the crowd expects</em>?
          </p>

          <div className="pg-take__sides pg-take__sides--strategy">
            <button
              className={`pg-take__side pg-take__side--neg${leg.direction === 'lower' ? ' pg-take__side--selected' : ''}`}
              onClick={() => setDirection(leg.marketId, 'lower')}
              disabled={loading || !market}
            >
              <span className="pg-take__side-arrow">↓</span>
              <span className="pg-take__side-label">No</span>
              <span className="pg-take__side-sub">Lower than consensus</span>
            </button>

            <button
              className={`pg-take__side pg-take__side--pos${leg.direction === 'higher' ? ' pg-take__side--selected' : ''}`}
              onClick={() => setDirection(leg.marketId, 'higher')}
              disabled={loading || !market}
            >
              <span className="pg-take__side-arrow">↑</span>
              <span className="pg-take__side-label">Yes</span>
              <span className="pg-take__side-sub">Higher than consensus</span>
            </button>
          </div>
        </div>

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
