# AGENTS.md

## First Split: using vs building

- If the task is about consuming or embedding the SDK, start with `packages/docs/static/llms.txt`. That is the consumer integration guide.
- If the task changes this repository itself, read `CLAUDE.md`, `internal_sdk_docs/CLAUDE.md`, and `internal_sdk_docs/PLAYBOOK.md` before editing.

## Workspace Reality

- This is an npm workspaces monorepo. The root `package.json` has workspaces but no root scripts; do not guess `npm run lint` / `npm run build` / `npm run test` names from habit.
- Each package exports directly from source: every package `main`/`types` points at `src/index.ts`.
- `demo-app/vite.config.ts` aliases `@functionspace/core`, `@functionspace/react`, and `@functionspace/ui` to `packages/*/src`.
- `packages/docs/src/plugins/sdk-webpack-plugin.js` does the same and also aliases `@demo-app` to `demo-app/src`; it relies on webpack `extensionAlias` so SDK imports written as `.js` resolve to `.ts`/`.tsx` source.

## Package Boundaries

- The enforced dependency chain is `core -> react -> ui`. See `tests/architecture.test.ts` before cross-package changes.
- `packages/core` must not import from `@functionspace/react` or `@functionspace/ui`.
- `packages/react` must not import from `@functionspace/ui`.
- UI components must not import `buy`, `sell`, `previewPayoutCurve`, or `previewSell` from core; use the mutation hooks from `@functionspace/react` instead.

## Verified Commands

- Run tests from repo root with `npx vitest run`.
- Run one test file with `npx vitest run tests/hooks.test.tsx`.
- Build the demo app from `demo-app/` with `npx vite build`.
- Build the docs site from `packages/docs/` with `npx docusaurus build`.
- Practical verification order in this repo is: tests, demo build, docs build.

## Test And Env Gotchas

- `vitest.config.ts` uses mixed environments: jsdom for React/component/cache tests, node for the rest.
- `tests/api-integration.test.ts` and auth integration cases talk to a live backend via `FS_TEST_URL`, `FS_TEST_USERNAME`, `FS_TEST_PASSWORD`, and `FS_TEST_MARKET_ID`.
- If those env vars are missing, the integration suite falls back to `http://localhost:8000` and market `15`.
- `packages/docs/docusaurus.config.js` loads env from `packages/docs/.env`, not a root `.env`. `FS_BASE_URL` is passed through `customFields.fsBaseUrl`.

## UI And Theme Rules That Break Easily

- All widget CSS lives in `packages/ui/src/styles/base.css`; do not add new CSS files.
- In CSS, use `var(--fs-*)` colors only.
- In Recharts props like `stroke`/`fill`, use `ctx.chartColors.*`, not CSS variables.
- Any new widget root `.fs-*` class must be added to the derived-variables selector near the top of `packages/ui/src/styles/base.css` or glow/gradient variables will silently break.
- Use `useId()` for DOM ids, `htmlFor`, and SVG ids; duplicate-id coverage lives in `tests/components.test.tsx`.

## Hook Patterns

- Data-fetching hooks return `{ namedData, loading, isFetching, error, refetch }` and use `useCacheSubscription`.
- Mutation hooks return `{ execute, loading, error, reset }` and use local state.

## Docs And Reviewer Sync

- Public API or behavior changes are not done until consumer docs are updated in `packages/docs/static/llms.txt` and the relevant `packages/docs/docs/*` pages.
- Internal implementation-pattern changes should also update `internal_sdk_docs/CLAUDE.md` and `internal_sdk_docs/PLAYBOOK.md`.
- After relevant changes, follow the checklists in `.claude/agents/architecture-reviewer.md` and `.claude/agents/theme-reviewer.md`.
