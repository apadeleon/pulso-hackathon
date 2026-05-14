import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunctionSpaceContext } from '@functionspace/react';
import type { FSContext } from '@functionspace/react';
import { buy } from '@functionspace/core';
import { useStrategy } from '../strategy/StrategyContext';
import { StrategyStepLeg } from '../strategy/StrategyStepLeg';
import { StrategyStepSummary } from '../strategy/StrategyStepSummary';
import type { LegResult } from '../strategy/StrategyStepSummary';
import { preflight } from '../strategy/preflight';
import { classifyExecutionError } from '../strategy/errors';

export function StrategyBuilder() {
  const navigate = useNavigate();
  // Cast resolves @types/react version mismatch between demo-app (18.2) and SDK packages (19.x)
  const ctx = useContext(FunctionSpaceContext as unknown as React.Context<FSContext | null>);
  const { legs, removeByMarket } = useStrategy();
  const [currentStep, setCurrentStep] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<LegResult[] | null>(null);

  const walletValue = ctx?.user?.walletValue ?? null;
  const isAuthenticated = ctx?.isAuthenticated ?? false;

  const pre = useMemo(
    () => preflight(legs, isAuthenticated, walletValue),
    [legs, isAuthenticated, walletValue],
  );

  // Single source of truth for closing the overlay. Use navigate('/') (not navigate(-1))
  // so close works even when the user landed on /strategy without a SPA push (refresh,
  // direct URL, full-page anchor).
  const handleClose = useCallback(() => {
    if (executing) return;
    navigate('/');
  }, [navigate, executing]);

  // Escape key closes the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

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
          marketId: leg.marketId, title: leg.title, status: 'success',
          positionId: result.positionId, claims: result.claims,
        });
      } catch (err) {
        const info = classifyExecutionError(err);
        newResults.push({
          marketId: leg.marketId, title: leg.title, status: 'error',
          errorKind: info.kind, errorMsg: info.message,
        });
        if (info.kind === 'insufficient_funds' || info.kind === 'not_authenticated') {
          stopped = true;
        }
      }
    }

    try { await ctx.refreshUser(); } catch { /* ignore */ }

    setResults(newResults);
    setExecuting(false);

    for (const r of newResults) {
      if (r.status === 'success') removeByMarket(r.marketId);
    }
  }, [ctx, pre.canExecute, legs, removeByMarket]);

  if (!ctx) return null;

  const summaryStep = legs.length;
  const isSummary = currentStep >= summaryStep || legs.length === 0;
  const clampedStep = Math.min(currentStep, Math.max(summaryStep - 1, 0));

  return (
    <>
      {/* Backdrop — sits behind the panel. Click closes on desktop; ignored on mobile (peek zone shows graph instead). */}
      <div
        className="pg-strategy-backdrop"
        onClick={handleClose}
        aria-hidden
      />

      <div className="pg-strategy-screen" role="dialog" aria-modal="true">
        {/* Transparent peek zone — only visible on mobile via CSS; hidden ≥ 768px */}
        <div className="pg-strategy-peek">
          <div className="pg-strategy-peek__label">
            {legs.length} market{legs.length !== 1 ? 's' : ''} selected ✓
          </div>
        </div>

        {/* The card / drawer itself */}
        <div className="pg-step-panel">
          {/* Close (×) button — top-right of the panel, visible in both layouts */}
          <button
            className="pg-step-close"
            onClick={handleClose}
            aria-label="Close combined bet"
            type="button"
          >×</button>

          <div className="pg-step-handle" />

          {!isSummary && legs[clampedStep] ? (
            <StrategyStepLeg
              leg={legs[clampedStep]}
              stepIndex={clampedStep}
              totalSteps={legs.length}
              onBack={() => {
                if (clampedStep === 0) handleClose();
                else setCurrentStep(s => s - 1);
              }}
              onNext={() => setCurrentStep(s => s + 1)}
            />
          ) : (
            <StrategyStepSummary
              onBack={() => setCurrentStep(Math.max(summaryStep - 1, 0))}
              onClose={handleClose}
              onExecute={handleExecute}
              executing={executing}
              results={results}
              preflight={pre}
            />
          )}
        </div>
      </div>
    </>
  );
}
