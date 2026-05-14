import React from 'react';
import { computeCombinedPayout } from './payout';
import { useStrategy } from './StrategyContext';
import type { PayoutCurve } from '@functionspace/core';
import type { PreflightResult } from './preflight';

interface StrategyPayoutSummaryProps {
  preflight: PreflightResult;
}

export function StrategyPayoutSummary({ preflight }: StrategyPayoutSummaryProps) {
  const { legs } = useStrategy();
  const readyLegs = legs.filter(l => l.direction && l.payoutPreview);
  const pendingCount = legs.filter(l => l.direction && !l.payoutPreview).length;
  const undirectedCount = legs.filter(l => !l.direction).length;

  const curves: PayoutCurve[] = readyLegs.map(l => l.payoutPreview!);
  const combined = computeCombinedPayout(curves);

  if (legs.length === 0) return null;

  return (
    <>
      <div className="pg-strategy-summary">
        <p className="pg-strategy-summary__title">Combined payout preview</p>

        {undirectedCount > 0 && (
          <p className="pg-strategy-summary__pending">
            {undirectedCount} leg{undirectedCount > 1 ? 's' : ''} need a direction
          </p>
        )}
        {pendingCount > 0 && (
          <p className="pg-strategy-summary__pending">
            Computing {pendingCount} preview{pendingCount > 1 ? 's' : ''}…
          </p>
        )}

        {readyLegs.length > 0 && (
          <>
            <div className="pg-strategy-summary__row">
              <span className="pg-strategy-summary__label">Total committed</span>
              <span className="pg-strategy-summary__value pg-strategy-summary__value--committed">
                ${combined.totalCommitted.toFixed(2)}
              </span>
            </div>
            <div className="pg-strategy-summary__row">
              <span className="pg-strategy-summary__label">Best case (all correct)</span>
              <span className="pg-strategy-summary__value pg-strategy-summary__value--best">
                ${combined.bestCase.toFixed(2)}
              </span>
            </div>
            <div className="pg-strategy-summary__row">
              <span className="pg-strategy-summary__label">Worst case (all wrong)</span>
              <span className="pg-strategy-summary__value pg-strategy-summary__value--worst">
                ${combined.worstCase.toFixed(2)}
              </span>
            </div>
            {preflight.walletAfter !== null && (
              <div className="pg-strategy-summary__row">
                <span className="pg-strategy-summary__label">Wallet after placing bets</span>
                <span className="pg-strategy-summary__value pg-strategy-summary__value--committed">
                  ${preflight.walletAfter.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}
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
    </>
  );
}
