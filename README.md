# Pulso Graph

Pulso Graph is a graph-first market exploration app built on top of the FunctionSpace SDK.

Instead of showing prediction markets as isolated contracts, Pulso Graph treats them as part of
one connected system. The home screen is an interactive graph where each node is a market and each
edge explains why two markets move together.

In the current version, the graph is curated around the 2026 FIFA World Cup, but the product idea
is not limited to sports. The same structure can be applied to any coherent subgroup of markets:
elections, AI, streaming, creator economy, crypto, tourism, or any event cluster where one market
has meaningful impact on others.

## Why this matters

Most market interfaces are good at helping users trade a single market.

Pulso Graph is trying to answer a different question:

> How do I understand a market in the context of the other markets around it?

That matters because users do not reason about real-world events one contract at a time. They think
in narratives, spillovers, and causal chains.

Examples:
- If Messi scores at the World Cup, that affects both a veteran-goals market and a Messi legacy market.
- If CONMEBOL teams advance deep, fan travel can influence broader tourism demand.
- If the World Cup becomes a major attention event, streaming and creator markets can react too.

Pulso Graph turns those relationships into a visible interface.

## Product view

The experience has two major parts.

### 1. Graph home

The home screen is the hero moment of the product.

- Each **node** is a market.
- Each **edge** is a relationship between two markets.
- Hovering a node should help the user understand:
  - what the market is about
  - what cluster it belongs to
  - why it matters
  - which nearby markets are most closely related

The graph is not meant to be a generic data visualization. It is meant to feel like a map of a
market narrative.

### 2. Detail view

Clicking a node should not drop the user into a generic trading terminal.

The detail page is meant to become a more understandable market story page:

- explain why the market matters
- explain what the crowd currently believes
- offer a simple way to take a view
- keep the graph context alive through a smaller local subgraph
- show related markets as part of the same storyline

The goal is to make the market understandable before asking the user to interact with trading tools.

## How the graph works

### Nodes

Nodes represent markets selected around a coherent thesis.

For the current World Cup prototype, the graph is centered on markets such as:
- World Cup final viewers
- attendance in Mexico venues
- VAR overturns
- yellow cards
- CONCACAF and CONMEBOL advancement
- youth minutes
- veteran goals
- Messi legacy
- streaming and creator attention spillovers
- global tourism demand

Each node can also carry product-level meaning such as:
- hub
- cluster anchor
- support node
- bridge node

### Edges

Edges are not just decorative lines.

Each edge represents a real relationship, for example:
- direct causal influence
- shared event driver
- attention spillover
- legacy or star-power amplification
- tourism or macro spillover

The edge should help answer:

> Why do these two markets belong near each other?

In the product direction for this fork, each important edge should have a plain-language explanation.
That explanation can be surfaced in hover states, the mini subgraph, or other supporting UI.

Example:
- `Lionel Messi Total Career Goals` <-> `Total Goals Scored by Players Aged 35 or Older`
  - If Messi scores in the World Cup, both markets move together directly.

- `Number of CONMEBOL Teams Reaching the Quarterfinals` <-> `Total Global International Tourist Arrivals`
  - Deeper South American runs can increase fan travel and destination demand.

## Why this is valuable for the user

Pulso Graph is useful because it helps users move from isolated prices to connected understanding.

User value includes:
- seeing which markets belong to the same event system
- understanding why a market matters beyond its own title
- spotting related opportunities instead of browsing blindly
- exploring a market through narrative rather than only through raw charts
- moving from discovery to action more naturally

For a normal user, this is much easier than jumping between disconnected market cards.

## World Cup as the current thesis

This prototype is intentionally scoped to the 2026 FIFA World Cup.

That gives the graph a strong center and clear branches:
- tournament mechanics
- team progression
- legacy / star power
- creator and streaming attention
- tourism spillover

This is important because the graph should feel intentional, not like a random sample of markets.

However, the product idea is broader than football.

The same pattern can work for:
- US elections and macroeconomic markets
- AI model releases and compute/capital markets
- gaming launches and creator economy markets
- entertainment franchises and social attention markets
- crypto ecosystems and adjacent platform metrics

The World Cup is the current vertical, not the limit of the concept.

## Manual graph today, graph database tomorrow

In this prototype, the graph is curated by hand.

That means:
- the markets are selected intentionally
- the strongest relationships are defined intentionally
- the graph is optimized for narrative clarity and visual coherence

This is the right trade for a high-quality proof of concept.

In a more realistic production environment, this could evolve into a larger graph system powered by:
- a **graph database** to store nodes, clusters, edge types, explanations, and rankings
- **LLM enrichment** to help propose, classify, and rank candidate relationships
- **heuristics** such as shared categories, timing windows, common entities, or event overlap
- **manual review layers** for the most important or product-facing relationships

That future version would allow the same idea to scale beyond a hand-curated graph while preserving
interpretability.

## FunctionSpace in this app

Pulso Graph is built on top of the FunctionSpace SDK.

The SDK is used as the market engine underneath the product layer:
- `@functionspace/core` for market math and protocol-level logic
- `@functionspace/react` for provider, hooks, caching, and data access
- `@functionspace/ui` for charts, trade widgets, auth, and activity components

The product direction in this fork is not to expose SDK widgets as-is everywhere.
Instead, the goal is to wrap them in a more understandable graph-native experience.

That means:
- the graph handles discovery
- editorial framing handles interpretation
- FunctionSpace widgets handle market data and interaction beneath that layer

## Current UX direction

The app is being shaped around these ideas:

1. **Graph-first discovery**
   - the home is the graph, not a market list

2. **Story-first detail pages**
   - clicking a node should open a market story page, not a raw terminal

3. **Explain the relationships**
   - edges should carry meaning, not just geometry

4. **Keep graph continuity alive after click**
   - a mini subgraph in the detail page helps preserve the feeling that the user is still inside a system

5. **Translate trading concepts into user language**
   - normal users should not need to understand internal SDK terminology to engage with the market

## Repository structure

This repository is still the FunctionSpace monorepo, with this app living in `demo-app/`.

```
packages/
├── core/       @functionspace/core    Pure TypeScript -- API client, math, types
├── react/      @functionspace/react   React integration -- Provider, hooks, context
└── ui/         @functionspace/ui      React components -- charts, trading panels, tables
demo-app/                              Pulso Graph application
```

## Documentation

- **Live SDK docs:** [docs.functionspace.dev](https://docs.functionspace.dev)
- **Docs source:** `packages/docs/`
- **AI context files:** `packages/docs/static/` -- `llms.txt`, `core.txt`, `react.txt`, `ui.txt`
- **Internal dev docs:** `internal_sdk_docs/`

## Notes

- The current graph is curated by hand for quality.
- The current thesis is World Cup-centered, but the model generalizes.
- The longer-term product direction includes graph DB + LLM-assisted relationship discovery and ranking.
- The immediate product goal is to make connected markets understandable and explorable for real users.