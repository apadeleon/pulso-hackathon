# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is the FunctionSpace SDK monorepo, but the active work is the **Pulso Graph** hackathon app in `demo-app/`. Pulso Graph is a graph-first prediction-market explorer built on top of the SDK, currently scoped to the 2026 FIFA World Cup.

## Are you working on Pulso Graph or the SDK?

**Pulso Graph** (the app) — everything lives in `demo-app/src/`. Read this file, then start there.

**SDK packages** — read `internal_sdk_docs/CLAUDE.md` and `internal_sdk_docs/PLAYBOOK.md` before touching `packages/`.

---

## Commands

```bash
# Pulso Graph dev server (primary work target)
cd demo-app && cp .env.example .env   # first time only — set VITE_FS_BASE_URL
cd demo-app && npx vite dev           # http://localhost:5173

# Build
cd demo-app && npx tsc && npx vite build

# SDK tests (required to pass before/after any packages/ change)
npx vitest run

# SDK docs site
cd packages/docs && npx docusaurus start
```

**Required env var:** `VITE_FS_BASE_URL` — points to a running FunctionSpace backend.

---

## Pulso Graph architecture

### Entry point

`demo-app/src/main.tsx` → `PulsoGraph.tsx` wraps the app in `FunctionSpaceProvider` + `BrowserRouter`.

Two routes:
- `/` — `GraphHome` (always mounted, so the force simulation never resets on back-nav)
- `/market/:marketId` — `MarketDetail`

### Screen layout

**GraphHome** (`screens/GraphHome.tsx`)
- Full viewport: left canvas (`pg-canvas-wrap`) + right rail (`pg-rail`)
- Canvas renders `GraphSVG` (the interactive SVG graph)
- Rail renders either `RailCover` (default editorial + cluster filters) or `RailStory` (focused-node detail)
- A floating `pg-map-card` overlays the canvas when a node is focused

**MarketDetail** (`screens/MarketDetail.tsx`)
- Full-page story view navigated to when a user clicks a node
- Sections: editorial hero → crowd read → trade panel → mini subgraph → activity feed
- Embeds SDK widgets: `MarketCharts`, `BinaryPanel`, `BucketTradePanel`, `PositionTable`, `TimeSales`

### Graph data flow

```
useMarkets() [SDK]
  └─ selectMarkets()        normalize.ts — filters to CURATED_MARKET_IDS, applies TITLE_EN overrides
       └─ buildEdges()      heuristics.ts — returns CURATED_EDGES filtered to loaded nodes
            └─ useGraphData()   returns { nodes, edges } with degree counts
                 └─ GraphSVG    renders static NODE_POSITIONS + sinusoidal drift animation
```

### Key data files

| File | What to edit |
|---|---|
| `graph/normalize.ts` | Add/remove markets (`CURATED_MARKET_IDS`), set cluster (`MARKET_CLUSTER`), override English titles (`TITLE_EN`) |
| `graph/heuristics.ts` | Add/remove/change edges (`CURATED_EDGES`) — each edge needs `from`, `to`, `strength`, `weight`, `reason` |
| `graph/editorial.ts` | Per-market editorial copy (`MARKET_EDITORIAL`) — `hoverExplanation`, `crowdSummary`, `whyItMatters`, `nowContext` |
| `components/GraphSVG.tsx` | Hand-placed node positions (`NODE_POSITIONS`), short labels (`NODE_SHORTS`), edge rendering kinds (`EDGE_KINDS`), keystone nodes (`KEYSTONES`) |
| `graph/theme.ts` | Cluster color helper `clusterColor()` |

### Cluster system

Four clusters (index 0–3): **World Cup Core**, **Legacy / Star Power**, **Attention / Creator**, **Travel Spillover**.

Design palette (from `GraphSVG.tsx`): `['#5468E8', '#E61D25', '#D1D4D1', '#3CAC3B']`

### Edge rendering

Four visual kinds (defined per edge pair in `EDGE_KINDS` in `GraphSVG.tsx`):
- `causal` — solid line + arrowhead
- `shared` — solid line
- `spillover` — dashed line
- `amplify` — double parallel stroke

---

## SDK architecture (for packages/ work)

```
packages/core     Pure TypeScript — API client, math, transactions (no React)
packages/react    React integration — Provider, hooks, context, caching
packages/ui       React components — TradePanel, ConsensusChart, MarketExplorer, etc.
packages/docs     Docusaurus documentation site
```

Layer rule: `core` has no React. `react` depends on `core` only. `ui` depends on `react` + `core`, but must use mutation hooks from `@functionspace/react` — never import `buy`/`sell`/`previewPayoutCurve`/`previewSell` from core directly in UI components.

SDK non-negotiables:
- No hex colors in CSS — use `var(--fs-*)` variables
- No new CSS files — all styles go in `packages/ui/src/styles/base.css`
- Run `npx vitest run` before and after every change to packages/
- Every new widget root class must be added to the derived-variables selector in `base.css`
