import React, { useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunctionSpaceContext } from '@functionspace/react';
import type { FSContext } from '@functionspace/react';
import { buy } from '@functionspace/core';
import { useStrategy } from '../strategy/StrategyContext';
import { StrategyLegCard } from '../strategy/StrategyLegCard';
import { StrategyPayoutSummary } from '../strategy/StrategyPayoutSummary';
import { preflight } from '../strategy/preflight';
import { classifyExecutionError } from '../strategy/errors';

interface LegResult {
  marketId: number;
  title: string;
  status: 'success' | 'error' | 'skipped';
  positionId?: string | number;
  claims?: number;
  errorKind?: string;
  errorMsg?: string;
}

export function StrategyBuilder() {
  const navigate = useNavigate();
  // Cast resolves @types/react version mismatch between demo-app (18.2) and SDK packages (19.x)
  const ctx = useContext(FunctionSpaceContext as unknown as React.Context<FSContext | null>);
  const { legs, removeByMarket } = useStrategy();
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<LegResult[] | null>(null);

  const walletValue = ctx?.user?.walletValue ?? null;
  const isAuthenticated = ctx?.isAuthenticated ?? false;

  const pre = useMemo(
    () => preflight(legs, isAuthenticated, walletValue),
    [legs, isAuthenticated, walletValue],
  );

  const handleExecute = useCallback(async () => {
    if (!ctx || !pre.canExecute) return;
    setExecuting(true);
    setResults(null);

    const newResults: LegResult[] = [];
    let stopped = false;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (stopped) {
        newResults.push({ marketId: leg.marketId, title: leg.title, status: 'skipped' });
        continue;
      }
      if (!leg.belief) {
        newResults.push({
          marketId: leg.marketId, title: leg.title, status: 'error',
          errorKind: 'incomplete_leg', errorMsg: 'Belief vector missing',
        });
        continue;
      }
      const numBuckets = leg.belief.length - 2;
      try {
        const result = await buy(ctx.client, leg.marketId, leg.belief, leg.collateral, numBuckets);
        ctx.invalidate(leg.marketId);
        newResults.push({
          marketId: leg.marketId,
          title: leg.title,
          status: 'success',
          positionId: result.positionId,
          claims: result.claims,
        });
      } catch (err) {
        const info = classifyExecutionError(err);
        newResults.push({
          marketId: leg.marketId,
          title: leg.title,
          status: 'error',
          errorKind: info.kind,
          errorMsg: info.message,
        });
        // Stop early on errors that will affect every remaining leg.
        if (info.kind === 'insufficient_funds' || info.kind === 'not_authenticated') {
          stopped = true;
        }
      }
    }

    try { await ctx.refreshUser(); } catch { /* ignore */ }

    setResults(newResults);
    setExecuting(false);

    // Remove successful legs from the cart so the user can adjust + retry the rest.
    for (const r of newResults) {
      if (r.status === 'success') removeByMarket(r.marketId);
    }
  }, [ctx, pre.canExecute, legs, removeByMarket]);

  if (!ctx) return null;

  const totalCollateral = pre.totalCollateral;

  return (
    <div className="pg-strategy-screen">
      <div className="pg-strategy-screen__header">
        <button className="pg-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <span className="pg-strategy-screen__title">Your combined bet</span>
        <span className="pg-strategy-screen__count">
          {legs.length} market{legs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="pg-strategy-screen__body">
        {legs.length === 0 && (
          <p className="pg-strategy-screen__empty">
            No markets in your combo yet. Go back to the graph, tap "Combine markets", then tap any markets to add them.
          </p>
        )}

        {legs.map(leg => <StrategyLegCard key={leg.marketId} leg={leg} />)}

        {legs.length > 0 && <StrategyPayoutSummary preflight={pre} />}

        {results && (
          <div className="pg-exec-results">
            <p className="pg-section__label">
              {results.filter(r => r.status === 'success').length}/{results.length} bets placed
            </p>
            {results.map(r => (
              <div
                key={r.marketId}
                className={`pg-exec-result pg-exec-result--${r.status}`}
              >
                <span className="pg-exec-result__icon">
                  {r.status === 'success' ? '✓' : r.status === 'skipped' ? '—' : '✗'}
                </span>
                <span className="pg-exec-result__text">{r.title}</span>
                {r.status === 'success' && r.positionId !== undefined && (
                  <span className="pg-exec-result__detail">
                    #{r.positionId} · {r.claims?.toFixed(2)} claims
                  </span>
                )}
                {r.status === 'error' && (
                  <span className="pg-exec-result__detail">
                    {r.errorKind === 'insufficient_funds' ? 'Insufficient funds'
                      : r.errorKind === 'not_authenticated' ? 'Sign in required'
                      : r.errorKind === 'market_closed' ? 'Market closed'
                      : r.errorMsg ?? 'Failed'}
                  </span>
                )}
                {r.status === 'skipped' && (
                  <span className="pg-exec-result__detail">Skipped (stopped after earlier failure)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pg-strategy-screen__footer">
        <button
          className="pg-execute-btn"
          disabled={!pre.canExecute || executing}
          onClick={handleExecute}
        >
          {executing
            ? 'Placing bets…'
            : pre.canExecute
              ? `Place ${legs.length} bet${legs.length !== 1 ? 's' : ''} — $${totalCollateral} total`
              : pre.blockers[0]?.message ?? 'Not ready'}
        </button>
      </div>
    </div>
  );
}
