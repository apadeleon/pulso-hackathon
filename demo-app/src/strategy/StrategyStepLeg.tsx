import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { generateRange } from '@functionspace/core';
import type { RangeInput } from '@functionspace/core';
import { FunctionSpaceContext, useDistributionState, useMarket, usePreviewPayout } from '@functionspace/react';
import type { FSContext } from '@functionspace/react';
import { DistributionChart } from '@functionspace/ui';
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
const MAX_BUCKET_SELECTIONS = 3;

export function StrategyStepLeg({ leg, stepIndex, totalSteps, onNext, onBack }: StrategyStepLegProps) {
  const ctx = useContext(FunctionSpaceContext as unknown as React.Context<FSContext | null>);
  const { setCollateral, setBelief, setPayoutPreview } = useStrategy();
  const { market, loading } = useMarket(leg.marketId);
  const distState = useDistributionState(leg.marketId);
  const { execute: previewFn } = usePreviewPayout(leg.marketId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedBuckets, setSelectedBuckets] = useState<number[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const toggleBucket = useCallback((index: number) => {
    setHasInteracted(true);
    setSelectedBuckets((prev) => {
      if (prev.includes(index)) return prev.filter((item) => item !== index);
      if (prev.length >= MAX_BUCKET_SELECTIONS) return [...prev.slice(1), index];
      return [...prev, index];
    });
  }, []);

  const localBelief = useMemo(() => {
    if (!market || !distState.buckets || selectedBuckets.length === 0) return null;

    const ranges: RangeInput[] = selectedBuckets
      .filter((index) => index >= 0 && index < distState.buckets!.length)
      .map((index) => ({
        low: distState.buckets![index].min,
        high: distState.buckets![index].max,
        sharpness: 1,
      }));

    if (ranges.length === 0) return null;

    return generateRange(
      ranges,
      market.config.numBuckets,
      market.config.lowerBound,
      market.config.upperBound,
    );
  }, [market, distState.buckets, selectedBuckets]);

  const effectiveBelief = hasInteracted ? localBelief : leg.belief;

  useEffect(() => {
    if (!ctx) return;

    ctx.setPreviewBelief(effectiveBelief);

    if (hasInteracted) {
      setBelief(leg.marketId, effectiveBelief);
    }

    return () => {
      ctx.setPreviewBelief(null);
    };
  }, [ctx, effectiveBelief, hasInteracted, leg.marketId, setBelief]);

  useEffect(() => {
    if (!effectiveBelief || leg.collateral <= 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const curve = await previewFn(effectiveBelief, leg.collateral);
        setPayoutPreview(leg.marketId, curve);
      } catch {
        // ignore — retries on next change
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [effectiveBelief, leg.collateral, leg.marketId, previewFn, setPayoutPreview]);

  const mean = market?.consensusMean ?? null;
  const units = market?.xAxisUnits ?? '';
  const lowerBound = market?.config.lowerBound ?? 0;
  const upperBound = market?.config.upperBound ?? 100;
  const meanDisplay = mean !== null
    ? `${Number.isInteger(mean) ? mean : mean.toFixed(1)}${units ? ` ${units}` : ''}`
    : '—';
  const bucketColumns = distState.bucketCount <= 9 ? 3 : distState.bucketCount <= 16 ? 4 : 5;

  return (
    <>
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

        {!loading && market && (
          <>
            <div className="pg-step-chart">
              <DistributionChart
                marketId={leg.marketId}
                distributionState={distState}
                height={160}
              />
            </div>

            <div className="pg-step-buckets">
              <div className="fs-bucket-range-grid" style={{ gridTemplateColumns: `repeat(${bucketColumns}, 1fr)` }}>
                {(distState.buckets ?? []).map((bucket, index) => (
                  <button
                    key={`${bucket.range}-${index}`}
                    type="button"
                    className={`fs-bucket-btn${selectedBuckets.includes(index) ? ' selected' : ''}`}
                    onClick={() => toggleBucket(index)}
                  >
                    <span className="fs-bucket-range-label">{bucket.range}</span>
                    <span className="fs-bucket-prob">{bucket.percentage.toFixed(1)}%</span>
                  </button>
                ))}
              </div>

              <div className="fs-bucket-range-status">
                <span className="fs-bucket-range-count">
                  {selectedBuckets.length}/{MAX_BUCKET_SELECTIONS} selected
                </span>
              </div>
            </div>
          </>
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

        {effectiveBelief && (
          <p className="pg-step-preview">
            {!leg.payoutPreview ? 'Previewing…'
              : `If correct: up to $${leg.payoutPreview.maxPayout.toFixed(2)}`}
          </p>
        )}
      </div>

      <div className="pg-step-nav">
        <button className="pg-step-nav__back" onClick={onBack}>← Back</button>
        <button
          className="pg-step-nav__next"
          onClick={onNext}
          disabled={!effectiveBelief}
        >
          {stepIndex === totalSteps - 1 ? 'Review →' : 'Next →'}
        </button>
      </div>
    </>
  );
}
