import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { BeliefVector, PayoutCurve } from '@functionspace/core';
import type { Direction } from './belief.ts';

export interface StrategyLeg {
  nodeId: string;
  marketId: number;
  title: string;
  direction: Direction | null;
  collateral: number;
  belief: BeliefVector | null;
  payoutPreview: PayoutCurve | null;
}

type StrategyAction =
  | { type: 'ADD'; leg: Pick<StrategyLeg, 'nodeId' | 'marketId' | 'title'> }
  | { type: 'REMOVE_BY_NODE'; nodeId: string }
  | { type: 'REMOVE_BY_MARKET'; marketId: number }
  | { type: 'SET_DIRECTION'; marketId: number; direction: Direction }
  | { type: 'SET_COLLATERAL'; marketId: number; collateral: number }
  | { type: 'SET_BELIEF'; marketId: number; belief: BeliefVector }
  | { type: 'SET_PAYOUT_PREVIEW'; marketId: number; payoutPreview: PayoutCurve }
  | { type: 'CLEAR' };

function reducer(state: StrategyLeg[], action: StrategyAction): StrategyLeg[] {
  switch (action.type) {
    case 'ADD':
      if (state.some(l => l.marketId === action.leg.marketId)) return state;
      return [...state, {
        ...action.leg,
        direction: null,
        collateral: 10,
        belief: null,
        payoutPreview: null,
      }];
    case 'REMOVE_BY_NODE':
      return state.filter(l => l.nodeId !== action.nodeId);
    case 'REMOVE_BY_MARKET':
      return state.filter(l => l.marketId !== action.marketId);
    case 'SET_DIRECTION':
      return state.map(l => l.marketId === action.marketId
        ? { ...l, direction: action.direction, belief: null, payoutPreview: null }
        : l);
    case 'SET_COLLATERAL':
      return state.map(l => l.marketId === action.marketId
        ? { ...l, collateral: action.collateral, payoutPreview: null }
        : l);
    case 'SET_BELIEF':
      return state.map(l => l.marketId === action.marketId ? { ...l, belief: action.belief } : l);
    case 'SET_PAYOUT_PREVIEW':
      return state.map(l => l.marketId === action.marketId ? { ...l, payoutPreview: action.payoutPreview } : l);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

interface StrategyContextValue {
  legs: StrategyLeg[];
  /** Derived Set of currently-selected graph node ids — graph reads this. */
  selectedNodeIds: Set<string>;

  addLeg: (leg: Pick<StrategyLeg, 'nodeId' | 'marketId' | 'title'>) => void;
  toggleByNode: (leg: Pick<StrategyLeg, 'nodeId' | 'marketId' | 'title'>) => void;
  removeByMarket: (marketId: number) => void;
  setDirection: (marketId: number, direction: Direction) => void;
  setCollateral: (marketId: number, collateral: number) => void;
  setBelief: (marketId: number, belief: BeliefVector) => void;
  setPayoutPreview: (marketId: number, payoutPreview: PayoutCurve) => void;
  clearCart: () => void;
  hasMarket: (marketId: number) => boolean;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [legs, dispatch] = useReducer(reducer, []);

  const selectedNodeIds = useMemo(() => new Set(legs.map(l => l.nodeId)), [legs]);

  const addLeg = useCallback(
    (leg: Pick<StrategyLeg, 'nodeId' | 'marketId' | 'title'>) => dispatch({ type: 'ADD', leg }),
    [],
  );
  const toggleByNode = useCallback(
    (leg: Pick<StrategyLeg, 'nodeId' | 'marketId' | 'title'>) => {
      if (selectedNodeIds.has(leg.nodeId)) {
        dispatch({ type: 'REMOVE_BY_NODE', nodeId: leg.nodeId });
      } else {
        dispatch({ type: 'ADD', leg });
      }
    },
    [selectedNodeIds],
  );
  const removeByMarket = useCallback((marketId: number) => dispatch({ type: 'REMOVE_BY_MARKET', marketId }), []);
  const setDirection = useCallback(
    (marketId: number, direction: Direction) => dispatch({ type: 'SET_DIRECTION', marketId, direction }),
    [],
  );
  const setCollateral = useCallback(
    (marketId: number, collateral: number) => dispatch({ type: 'SET_COLLATERAL', marketId, collateral }),
    [],
  );
  const setBelief = useCallback(
    (marketId: number, belief: BeliefVector) => dispatch({ type: 'SET_BELIEF', marketId, belief }),
    [],
  );
  const setPayoutPreview = useCallback(
    (marketId: number, payoutPreview: PayoutCurve) =>
      dispatch({ type: 'SET_PAYOUT_PREVIEW', marketId, payoutPreview }),
    [],
  );
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const hasMarket = useCallback((marketId: number) => legs.some(l => l.marketId === marketId), [legs]);

  return (
    <StrategyContext.Provider value={{
      legs, selectedNodeIds,
      addLeg, toggleByNode, removeByMarket,
      setDirection, setCollateral, setBelief, setPayoutPreview,
      clearCart, hasMarket,
    }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy(): StrategyContextValue {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error('useStrategy must be used within StrategyProvider');
  return ctx;
}
