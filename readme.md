# DepGraph — Composio Tool Dependency Visualizer

Discover which Composio tools produce data that other tools consume. Visualize the dependency graph, plan execution order, and analyze downstream impact — all in a single HTML file.

## Features

- **Dependency Graph** — Force-directed and hierarchical layout of 1000+ tools with real-time filtering by toolkit, name, and confidence.
- **Workflow Planner** — Select any tool to see its ordered execution plan. Animate the plan to watch dependencies resolve step by step, with a live mini DAG.
- **Impact Analysis** — Click any tool to see its transitive downstream dependents. Highlight them in the graph or drill in.
- **Dynamic Toolkits** — Add any Composio toolkit on the fly via a local server. New toolkits get auto-assigned colors and are merged into the graph, filter, and legend.
- **Export PNG** — One-click screenshot of the current graph view.
- **Stats Dashboard** — Top producers, top consumers, parameter distribution, and per-toolkit breakdowns.
- **All offline** — The generated `graph.html` works standalone (vis-network loaded from CDN). No backend needed for the base graph.

## Quick Start

```sh
# Install dependencies
bun install

# Build the base graph (Google Super + GitHub)
bun run src/index.ts

# Open the visualization
open graph.html
```

## Adding More Toolkits

Start the companion server:

```sh
bun run server.ts
```

Then open `graph.html`, go to the **Toolkits** tab, enter a toolkit slug (e.g. `slack`, `notion`, `asana`), optionally override the API key, and click **Fetch**. The server proxies the Composio API and runs the analysis.

Server listens on `http://localhost:3456` by default (set `PORT` env to change). Uses `COMPOSIO_API_KEY` from env or `.env`.

## How It Works

1. **Fetcher** (`src/fetcher.ts`) — Pulls tool definitions from the Composio API via `@composio/core`, with disk caching.
2. **Analyzer** (`src/analyzer.ts`) — Extracts entity names from output JSON Schema `$ref`s, matches them against required input parameters, and creates dependency edges. Picks the best producer per entity using verb priority (LIST > SEARCH > GET > other).
3. **Visualizer** (`src/visualizer.ts`) — Generates a self-contained `graph.html` with vis-network, all data inlined, plus the Planner, Stats, Toolkits tabs and detail panel.

## Stack

- **Runtime**: Bun (Node with `tsx` works too, but path resolution via `import.meta.dir` is Bun-optimized)
- **SDK**: `@composio/core` for tool fetching
- **Visualization**: vis-network (CDN)
- **Style**: Inter font, dark theme, no external CSS dependencies

## Project Structure

```
src/
  index.ts      — Pipeline runner (fetch → analyze → visualize)
  fetcher.ts    — Composio API client with caching
  analyzer.ts   — Dependency detection via JSON Schema $ref matching
  visualizer.ts — HTML/JS/CSS generator
  types.ts      — Shared TypeScript types
server.ts       — API server for on-demand toolkit fetching
graph.html      — Generated visualization (committed for easy sharing)
graph.json      — Structured graph data (nodes + edges)
```
