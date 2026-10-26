# Geo GameSim

An interactive game-theory laboratory for exploring cooperation, conflict and coalition formation between countries. Geo GameSim combines an interactive world map, language-model-generated scenario inputs, deterministic repeated games, exact pure Nash equilibrium search and a simple multi-agent learning baseline.

The application supports Persian (right-to-left) and English (left-to-right), with a language selector in the header and a saved language preference. The game engines are written in TypeScript and run locally in the browser after scenario inputs have been obtained.

## Features

- Select countries on a world map built from Natural Earth 110m data.
- Explore bilateral cooperation through 50-round, Prisoner's-Dilemma-inspired games.
- Analyze conflict scenarios with exact enumeration of alignment profiles and pure Nash equilibria.
- Compare equilibrium results with 1,000 episodes of independent action-value learning.
- Inspect round playback, cumulative payoffs, relationship trajectories, alignment tables and learning histories in a dedicated results window.
- Close results with the × button, Escape or the backdrop, and reopen them using **View results**. Requests can finish while the window is closed.
- Configure an OpenAI-compatible language-model endpoint, with cached responses and per-request retry controls.
- Run locally with Node.js or serve a production build using Docker Compose.

## Quick start

Use Node.js 22.12 or newer within the Node.js 22 release line, or a newer supported LTS release, and npm.

```bash
git clone https://github.com/bazarghan/geo-gamesim.git
cd geo-gamesim
npm ci
npm run dev
```

Open the address printed by Vite. To build and preview the production version:

```bash
npm run build
npm run preview
```

### Configure the language model

Open the settings panel using the gear icon and enter:

| Setting | Purpose |
| --- | --- |
| Base URL | An OpenAI-compatible API root; the default is `https://openrouter.ai/api/v1` |
| API key | A key for the configured provider |
| Model | A model identifier supported by that provider |

Model rationales are requested in the selected language. Switching language keeps the selected countries and resets displayed results; rerun the experiment to obtain responses in the new language. Cached results are separated by provider, model and language.

The client appends `/chat/completions` to the base URL and requests JSON output. The endpoint must support browser requests through CORS. No application backend or database is required.

Settings, including the API key, are saved in the browser's `localStorage`. Requests go directly from the browser to the configured provider. Use a personal development key on a trusted browser; a shared deployment should put provider credentials behind a server. Cached inputs can be cleared from settings.

## Experiment modes

### Bilateral simulation

1. Select two or three countries on the map.
2. Run the simulation to request a **Friendliness Score** from 0 to 10 and a rationale for each unordered **Pairing**.
3. Inspect the 50-round playback, actions, cumulative payoffs and score trajectory.
4. With three countries, compare all three Pairings and the Overall Verdict.

The starting score determines a Strategy Archetype: Aggressive, Suspicious, Reciprocator, Cautious Cooperator or Loyal Ally. Both members of a Pairing share its score and archetype. Each round updates the score through local **Drift**: cooperation adds `0.05` per cooperating side, defection subtracts `0.05` per defecting side, and the result is clamped to `[0, 10]`.

The score-dependent payoff matrix uses:

```text
T = 5 - 0.2s    temptation to defect
R = 3 + 0.2s    mutual cooperation reward
P = 1          mutual defection payoff
S = 0          unilateral cooperation payoff
```

This is a modified repeated game: at `s >= 5`, `T > R` no longer holds, so the matrix is no longer a strict Prisoner's Dilemma. The changing incentive structure is part of the model.

The final 10 rounds determine the Pairing Verdict: **PEACE**, **COLD WAR** or **WAR**. For three countries, the Overall Verdict is **PEACE** when all pairs cooperate, **WAR** when any pair ends in mutual defection, and **TENSION** otherwise. A seeded random generator makes a run reproducible for a fixed Pairing and starting score. There are no language-model calls during the rounds.

### Conflict scenario analysis

1. Select the two belligerents first, then add other parties, for a total of 3–10 countries.
2. Run the analysis to obtain each Party's **Payoff Parameters**: affinity to Side A, affinity to Side B, neutrality value and power weight, each on a 0–10 scale.
3. Inspect the Nash equilibria, Pareto flags, learned Alignment Profile and episode history.

Each agent chooses **SIDE A**, **SIDE B** or **NEUTRAL**. The payoff model is:

```text
Join side = affinity to that side + 10 × (bloc power / total power) - 5
Neutral   = neutrality value + own power weight
```

The exact solver enumerates all `3^n` Alignment Profiles and retains those with no profitable unilateral deviation. Pareto flags compare the discovered equilibria with one another. If no pure equilibrium exists, the engine reports a profile with the fewest agents able to improve by switching alone.

The learning baseline maintains three action values per agent and updates the selected value toward its observed payoff. It runs 1,000 episodes with learning rate `0.1` and epsilon-greedy exploration decaying from `1.0` to `0.05`. Its final greedy profile is checked against the exact equilibria; convergence to an equilibrium is not guaranteed.

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/domain/gameEngine.ts` | Payoffs, exhaustive Nash search, Pareto comparison and multi-agent learning |
| `src/domain/analysis.ts` | Conflict analysis and presentation data |
| `src/sim/` | Repeated-game engine, trajectory data and aggregate verdicts |
| `src/llm/` | Friendliness and payoff clients, response parsing and browser caches |
| `src/map/` | World geometry, projection and labels |
| `src/settings/` | Provider configuration and browser persistence |
| `src/components/` | Map, settings, playback, diagrams and results screens |
| `src/i18n.ts` | Persian country names and interface translations |
| [`CONTEXT.md`](./CONTEXT.md) | Domain vocabulary and concepts |

**Stack:** React 19, TypeScript, Vite, D3 Geo, TopoJSON, Recharts, Vitest and oxlint.

## Checks

```bash
npm run build  # TypeScript checking and production bundle
npm test      # Unit and component tests
npm run lint  # oxlint
```

The test suite covers selection rules, map geometry, provider clients, settings, caches, repeated-game dynamics, equilibrium analysis, reproducibility and rendered components. Tests use controlled inputs and mocks; they do not require a paid language-model call.

## Docker

```bash
docker compose up --build -d
```

Open `http://localhost:42400`. To choose a different host port:

```bash
PORT=8080 docker compose up --build -d
```

The image builds the static application and serves it with `serve` on container port `42400`.

## Model scope

Geo GameSim is an educational and experimental model. Its outputs depend on language-model estimates and simplified payoff assumptions, without empirical validation as geopolitical forecasts. Determinism applies to fixed scenario inputs and seeds; refreshing model responses can change those inputs.

Bilateral Pairings evolve independently rather than forming a coupled three-country game. In conflict mode, the first two selections establish the scenario context, but the solver allows every selected Party, including the belligerents, to choose any Alignment. Exact enumeration grows exponentially with the number of parties. The learning baseline is stateless action-value learning rather than a trained policy for real-world sequential decisions.
