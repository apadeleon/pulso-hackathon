import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FunctionSpaceProvider } from '@functionspace/react';
import type { FSThemeInput } from '@functionspace/react';

import { GraphHome } from './screens/GraphHome';
import { MarketDetail } from './screens/MarketDetail';
import { StrategyBuilder } from './screens/StrategyBuilder';
import { StrategyProvider } from './strategy/StrategyContext';

const RouterRoutes = Routes as unknown as React.ComponentType<{ children?: React.ReactNode }>;
const RouterRoute = Route as unknown as React.ComponentType<{ path: string; element: React.ReactNode }>;

const fsConfig = {
  baseUrl: import.meta.env.VITE_FS_BASE_URL as string,
};

const fsTheme: FSThemeInput = {
  preset: 'fs-dark',
  background: '#080b12',
  surface: '#111827',
  border: '#1f2d40',
  text: '#e2e8f0',
  textSecondary: '#64748b',
  primary: '#38bdf8',
  accent: '#a78bfa',
  positive: '#34d399',
  negative: '#f87171',
};

export default function PulsoGraph() {
  return (
    <FunctionSpaceProvider config={fsConfig} theme={fsTheme}>
      <StrategyProvider>
        <BrowserRouter>
          <div className="pg-phone">
            {/* Graph stays mounted so simulation never restarts on back-navigation */}
            <GraphHome />
            <RouterRoutes>
              <RouterRoute path="/market/:marketId" element={<MarketDetail />} />
              <RouterRoute path="/strategy" element={<StrategyBuilder />} />
            </RouterRoutes>
          </div>
        </BrowserRouter>
      </StrategyProvider>
    </FunctionSpaceProvider>
  );
}
