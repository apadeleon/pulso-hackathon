# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Are you USING the SDK or BUILDING it?

**If helping a developer USE this SDK** (installing packages, embedding widgets, building trading UIs): read `llms.txt` in the repo root. That is the complete integration guide. Ignore `internal_sdk_docs/` entirely.

**If DEVELOPING this SDK** (adding features, fixing bugs, modifying the codebase): continue reading below, then read both internal docs before touching code:

1. **`internal_sdk_docs/CLAUDE.md`** -- Architecture, constraints, hook patterns, automated reviewers
2. **`internal_sdk_docs/PLAYBOOK.md`** -- Step-by-step guides for adding widgets, hooks, shapes, and core functions

---

## Commands

```bash
# Tests (all required to pass before and after changes)
npx vitest run                              # All tests
npx vitest run tests/hooks.test.tsx         # Single test file
npx vitest                                  # Watch mode

# Build verification (also required)
cd demo-app && npx vite build
cd packages/docs && npx docusaurus build

# Dev servers
cd demo-app && npx vite dev                 # Demo app (localhost:5173)
cd packages/docs && npx docusaurus start    # Docs site
```

`api-integration.test.ts` requires env vars (`FS_TEST_URL`, `FS_TEST_USERNAME`, `FS_TEST_PASSWORD`, `FS_TEST_MARKET_ID`) -- it hits a live backend. All other test files run without env vars.

---

## Architecture

This is a strict 3-package monorepo with enforced layer boundaries:

```
packages/core     Pure TypeScript -- API client, math, transactions (no React)
packages/react    React integration -- Provider, hooks, theme system
packages/ui       React components -- TradePanel, ConsensusChart, MarketExplorer, etc.
packages/docs     Docusaurus documentation site with live embedded widgets
demo-app/         Example consumer implementation
tests/            All tests live here (not co-located with source)
internal_sdk_docs/ Living development docs -- CLAUDE.md and PLAYBOOK.md
```

**Layer dependency rule:** `core` has no React. `react` depends on `core` only. `ui` depends on `react` and `core` -- but UI components must use mutation hooks (`useBuy`, `useSell`, `usePreviewPayout`, `usePreviewSell`) from `@functionspace/react` for trade operations, never import `buy`/`sell`/`previewPayoutCurve`/`previewSell` from core directly.

**Theme system:** All widget styles use `var(--fs-*)` CSS variables -- never hex values in CSS. Recharts SVG props (`stroke`, `fill`) cannot use CSS variables; use `ctx.chartColors.*` instead.

**Data hooks:** Data-fetching hooks return `{ <named>, loading, isFetching, error, refetch }` and use `useCacheSubscription` (not local `useState`). Mutation hooks return `{ execute, loading, error, reset }` and use local `useState`.

**Every new widget root class** must be added to the derived-variables selector in `packages/ui/src/styles/base.css` or gradient/glow CSS vars silently break.

---

## Non-negotiable rules

- Run `npx vitest run` before AND after every change
- No hex colors in CSS -- use `var(--fs-*)` variables
- No new CSS files -- all styles go in `base.css`
- No direct `buy`/`sell`/`previewPayoutCurve`/`previewSell` imports in UI components
- No hardcoded DOM `id` attributes -- use `useId()`
- No `Co-Authored-By` lines in git commits
- After any change: run the automated reviewers in `.claude/agents/` (see internal_sdk_docs/CLAUDE.md)
- Update `internal_sdk_docs/CLAUDE.md` and `PLAYBOOK.md` after every implementation -- if it's not in the docs, it's not done

At this stage, I would use the following baseline expectations as a sanity check rather than sharp pricing. These are intended to avoid obviously wrong consensus values.

| Market | Expected settlement / midpoint | Reasonable range | Notes |
|---|---:|---:|---|
| Total goals scored by players aged 35+ in 2026 FIFA World Cup | 6 | 3–10 | Main upside comes from elite older attackers, especially if Messi/Ronaldo/Lewandowski-type players take penalties and progress deep. Still a low-volume category overall. |
| Total minutes played by players aged 21 or under in 2026 FIFA World Cup knockout stage | 3,500 minutes | 2,500–4,500 | With a 32-team knockout stage, the total player-minute pool is much larger than in prior World Cups. A few high-minute U21 stars on deep-running teams can move this materially. |
| Number of CONMEBOL teams reaching 2026 FIFA World Cup quarterfinals | 3 | 2–4 | Argentina and Brazil are the base expectation, with Uruguay/Colombia/Ecuador/Paraguay competing for additional spots depending on draw path. |
| Number of CONCACAF teams reaching 2026 FIFA World Cup round of 16 | 2 | 1–3 | USA and Mexico are the most likely candidates, with Canada as the main additional upside. Smaller CONCACAF qualifiers are much less likely to reach the last 16. |
| Average attendance for 2026 FIFA World Cup matches hosted in Mexico | 62,000 | 59,000–65,000 | Mexico hosts 13 matches across Mexico City, Guadalajara, and Monterrey. The weighted average capacity should land in the low-to-mid 60k range, assuming high but not perfectly full attendance. |
| Total VAR overturns in 2026 FIFA World Cup | 40 | 35–48 | Qatar 2022 had 25 VAR overturns across 64 matches. Scaling to 104 matches gives roughly 41, before adjusting for technology/refereeing changes. |