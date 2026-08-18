# Geo GameSim

Simulate international relationships as an iterated Prisoner's Dilemma.
Pick 2–3 countries on a world map; each unordered pair (a **Pairing**, see
[`CONTEXT.md`](./CONTEXT.md)) will be scored and simulated in later tickets.

Ticket 01 delivers the scaffold: a selectable Natural Earth 110m world map
(Antarctica excluded) with hover tooltips, selection highlighting and labels,
and a "Run Simulation" button that activates once 2–3 countries are selected.

## Commands

| Command           | What it does                    |
| ----------------- | ------------------------------- |
| `npm run dev`     | Start the dev server            |
| `npm run build`   | Typecheck and build for prod    |
| `npm run preview` | Preview the production build    |
| `npm run test`    | Run unit tests (Vitest)         |
| `npm run lint`    | Lint with oxlint                |

## Layout

- `src/domain/` — pure logic: `Country`, selection state (cap 3), `Pairing`
- `src/map/` — world data (world-atlas / Natural Earth 110m), projection,
  label-anchor geometry
- `src/components/` — `WorldMap` and `SelectionPanel`
