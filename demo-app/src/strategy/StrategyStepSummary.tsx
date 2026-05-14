import React from 'react';
import type { PayoutCurve } from '@functionspace/core';
import { useStrategy } from './StrategyContext';
import { computeCombinedPayout } from './payout';
import type { PreflightResult } from './preflight';

export interface LegResult {
  marketId: number;
  title: string;
  status: 'success' | 'error' | 'skipped';
  positionId?: string | number;
  claims?: number;
  errorKind?: string;
  errorMsg?: string;
}

interface StrategyStepSummaryProps {
  onBack: () => void;
  onClose: () => void;
  onExecute: () => Promise<void>;
  executing: boolean;
  results: LegResult[] | null;
  preflight: PreflightResult;
}

export function StrategyStepSummary({ onBack, onClose, onExecute, executing, results, preflight }: StrategyStepSummaryProps) {
  const { legs } = useStrategy();

  const readyLegs = legs.filter(l => l.direction && l.payoutPreview);
  const previewPending = legs.some(l => l.direction && !l.payoutPreview);
  const curves: PayoutCurve[] = readyLegs.map(l => l.payoutPreview!);
  const combined = computeCombinedPayout(curves);
  const totalStake = legs.reduce((s, l) => s + l.collateral, 0);

  const multiplier = combined.totalCommitted > 0
    ? (combined.bestCase / combined.totalCommitted).toFixed(1)
    : null;
  const netLoss = combined.totalCommitted - combined.worstCase;

  const successCount = results ? results.filter(r => r.status === 'success').length : 0;
  const allSucceeded = results ? successCount === results.length : false;

  if (results) {
    return (
      <>
        <div className="pg-step-scroll">
          <h2 className="pg-step-title" style={{ marginTop: 8 }}>
            {allSucceeded ? '🎉 All bets placed' : `${successCount} of ${results.length} bets placed`}
          </h2>

          <div className="pg-exec-results">
            {results.map(r => (
              <div key={r.marketId} className={`pg-exec-result pg-exec-result--${r.status}`}>
                <span className="pg-exec-result__icon">
                  {r.status === 'success' ? '✓' : r.status === 'skipped' ? '—' : '✗'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="pg-exec-result__text">{r.title}</span>
                  {r.status === 'success' && r.positionId !== undefined && (
                    <div className="pg-exec-result__detail">
                      Position #{r.positionId} · {r.claims?.toFixed(2)} claims
                    </div>
                  )}
                  {r.status === 'error' && (
                    <div className="pg-exec-result__detail">
                      {r.errorKind === 'insufficient_funds' ? 'Insufficient funds'
                        : r.errorKind === 'not_authenticated' ? 'Sign in required'
                        : r.errorKind === 'market_closed' ? 'Market closed'
                        : r.errorMsg ?? 'Failed'}
                    </div>
                  )}
                  {r.status === 'skipped' && (
                    <div className="pg-exec-result__detail">Skipped — earlier bet failed</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pg-step-nav">
          <button className="pg-step-nav__execute" onClick={onClose} style={{ flex: 1 }}>
            Done
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pg-step-scroll">
        <div className="pg-step-dots">
          {Array.from({ length: legs.length + 1 }).map((_, i) => (
            <div
              key={i}
              className={`pg-step-dot${i === legs.length ? ' pg-step-dot--active' : ' pg-step-dot--done'}`}
            />
          ))}
        </div>
        <p className="pg-step-label">Review · {legs.length} market{legs.length !== 1 ? 's' : ''}</p>

        <h2 className="pg-step-title">Your combined bet</h2>

        <div className="pg-summary-legs">
          {legs.map(leg => (
            <div key={leg.marketId} className="pg-summary-leg">
              <span className="pg-summary-leg__title">{leg.title}</span>
              <div className="pg-summary-leg__meta">
                {leg.direction ? (
                  <span className={`pg-summary-leg__dir pg-summary-leg__dir--${leg.direction}`}>
                    {leg.direction === 'higher' ? '↑ Yes' : '↓ No'}
                  </span>
                ) : (
                  <span className="pg-summary-leg__dir pg-summary-leg__dir--missing">No call</span>
                )}
                <span className="pg-summary-leg__amount">${leg.collateral}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pg-summary-table">
          <div className="pg-summary-table__row pg-summary-table__row--best">
            <span className="pg-summary-table__label">All correct</span>
            <span className="pg-summary-table__value">
              {previewPending ? 'Computing…' : multiplier ? `${multiplier}× → $${combined.bestCase.toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="pg-summary-table__row pg-summary-table__row--neutral">
            <span className="pg-summary-table__label">Total stake</span>
            <span className="pg-summary-table__value">${totalStake.toFixed(2)}</span>
          </div>
          <div className="pg-summary-table__row pg-summary-table__row--worst">
            <span className="pg-summary-table__label">All wrong</span>
            <span className="pg-summary-table__value">
              {previewPending ? 'Computing…' : multiplier ? `−$${netLoss.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {preflight.blockers.length > 0 && (
          <div className="pg-preflight">
            {preflight.blockers.map((b, i) => (
              <div
                key={i}
                className={`pg-preflight__item${b.kind === 'incomplete_leg' ? ' pg-preflight__item--warning' : ''}`}
              >
                {b.message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pg-step-nav">
        <button className="pg-step-nav__back" onClick={onBack}>← Back</button>
        <button
          className="pg-step-nav__execute"
          disabled={!preflight.canExecute || executing}
          onClick={onExecute}
        >
          {executing
            ? 'Placing bets…'
            : preflight.canExecute
              ? `Place ${legs.length} bet${legs.length !== 1 ? 's' : ''} · $${preflight.totalCollateral}`
              : preflight.blockers[0]?.message ?? 'Not ready'}
        </button>
      </div>
    </>
  );
}
