import type { StrategyLeg } from './StrategyContext';

export type PreflightBlockerKind =
  | 'not_authenticated'
  | 'no_legs'
  | 'incomplete_leg'
  | 'invalid_collateral'
  | 'insufficient_funds';

export interface PreflightBlocker {
  kind: PreflightBlockerKind;
  message: string;
  /** Set for leg-scoped blockers so the UI can highlight that card. */
  legMarketId?: number;
  /** Set only for insufficient_funds — how much short the user is. */
  shortfall?: number;
}

export interface PreflightResult {
  canExecute: boolean;
  totalCollateral: number;
  /** From wallet check — null if walletValue was unknown at check time. */
  walletAfter: number | null;
  blockers: PreflightBlocker[];
}

export function preflight(
  legs: StrategyLeg[],
  isAuthenticated: boolean,
  walletValue: number | null,
): PreflightResult {
  const blockers: PreflightBlocker[] = [];
  const totalCollateral = legs.reduce((s, l) => s + l.collateral, 0);

  if (!isAuthenticated) {
    blockers.push({ kind: 'not_authenticated', message: 'Log in to place bets' });
  }
  if (legs.length === 0) {
    blockers.push({ kind: 'no_legs', message: 'Select at least one market on the graph' });
  }

  for (const leg of legs) {
    if (!leg.direction || !leg.belief) {
      blockers.push({
        kind: 'incomplete_leg',
        message: `${leg.title}: choose Higher or Lower`,
        legMarketId: leg.marketId,
      });
    }
    if (leg.collateral <= 0) {
      blockers.push({
        kind: 'invalid_collateral',
        message: `${leg.title}: bet amount must be greater than 0`,
        legMarketId: leg.marketId,
      });
    }
  }

  if (walletValue !== null && totalCollateral > walletValue) {
    blockers.push({
      kind: 'insufficient_funds',
      message: `Need $${(totalCollateral - walletValue).toFixed(2)} more — wallet has $${walletValue.toFixed(2)}, strategy commits $${totalCollateral.toFixed(2)}`,
      shortfall: totalCollateral - walletValue,
    });
  }

  return {
    canExecute: blockers.length === 0,
    totalCollateral,
    walletAfter: walletValue !== null ? walletValue - totalCollateral : null,
    blockers,
  };
}
