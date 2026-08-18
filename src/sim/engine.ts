import { pairingId, type Pairing } from "../domain/pairing"

/** Fixed number of Rounds every Pairing plays (see CONTEXT.md, "Round"). */
export const ROUND_COUNT = 50

/** How many final Rounds the Verdict is judged over (see CONTEXT.md, "Verdict"). */
export const VERDICT_WINDOW = 10

/** Drift applied to the live Friendliness Score per cooperating/defecting side. */
export const DRIFT_PER_SIDE = 0.05

/** A country's move in one Round — Cooperate or Defect. */
export type Move = "cooperate" | "defect"

/**
 * A country's disposition, derived deterministically from the Friendliness
 * Score by threshold (see CONTEXT.md, "Strategy Archetype"). The score is
 * symmetric per Pairing, so both members of a Pairing share one archetype —
 * re-derived each Round from the live, drifting score.
 */
export type StrategyArchetype =
  | "Aggressive"
  | "Suspicious"
  | "Reciprocator"
  | "Cautious Cooperator"
  | "Loyal Ally"

/** Final classification of a Pairing, judged over its final Rounds. */
export type Verdict = "PEACE" | "COLD WAR" | "WAR"

/** One Round of the iterated Prisoner's Dilemma, fully precomputed. */
export type Round = {
  readonly index: number
  readonly archetype: StrategyArchetype
  readonly leftMove: Move
  readonly rightMove: Move
  readonly leftPayoff: number
  readonly rightPayoff: number
  readonly leftTotal: number
  readonly rightTotal: number
  readonly scoreBefore: number
  readonly scoreAfter: number
}

/** An instantly-computed, fully deterministic playthrough of a Pairing. */
export type Simulation = {
  readonly pairing: Pairing
  readonly initialScore: number
  readonly rounds: readonly Round[]
  readonly finalScore: number
  readonly verdict: Verdict
}

/**
 * Map a Friendliness Score to its Strategy Archetype by threshold:
 * 0–2 Aggressive, 3–4 Suspicious, 5–6 Reciprocator, 7–8 Cautious
 * Cooperator, 9–10 Loyal Ally.
 */
export function archetypeFor(score: number): StrategyArchetype {
  if (score <= 2) return "Aggressive"
  if (score <= 4) return "Suspicious"
  if (score <= 6) return "Reciprocator"
  if (score <= 8) return "Cautious Cooperator"
  return "Loyal Ally"
}

/**
 * The Prisoner's Dilemma payoff matrix tilted by the Friendliness Score s:
 * T = 5 − 0.2·s, R = 3 + 0.2·s, P = 1, S = 0. Friendlier pairs find
 * cooperation more rewarding and betrayal less tempting.
 */
export type TiltedPayoffs = {
  readonly temptation: number
  readonly reward: number
  readonly punishment: number
  readonly sucker: number
}

export function payoffsFor(score: number): TiltedPayoffs {
  return {
    temptation: round2(5 - 0.2 * score),
    reward: round2(3 + 0.2 * score),
    punishment: 1,
    sucker: 0,
  }
}

/**
 * Drift: the algorithmic change to a Pairing's live Friendliness Score as a
 * Round plays out — each cooperating side raises it by DRIFT_PER_SIDE, each
 * defecting side lowers it, clamped to 0–10. Purely local; no LLM involved.
 */
export function drift(score: number, left: Move, right: Move): number {
  const net =
    (left === "cooperate" ? 1 : -1) + (right === "cooperate" ? 1 : -1)
  return clampScore(round2(score + net * DRIFT_PER_SIDE))
}

/** Classify a run by its final Rounds: mutual cooperation is PEACE, mutual defection is WAR, anything mixed is COLD WAR. */
export function verdictFor(rounds: readonly Round[], window: number = VERDICT_WINDOW): Verdict {
  const tail = rounds.slice(-window)
  if (tail.length === 0) return "COLD WAR"
  if (tail.every((round) => round.leftMove === "cooperate" && round.rightMove === "cooperate")) {
    return "PEACE"
  }
  if (tail.every((round) => round.leftMove === "defect" && round.rightMove === "defect")) {
    return "WAR"
  }
  return "COLD WAR"
}

/**
 * Compute the whole 50-Round story at once, instantly. Deterministic: the
 * same (Pairing, score) always yields the same Rounds, because the only
 * randomness is a PRNG seeded from the Pairing and score. No LLM calls.
 */
export function simulate(pairing: Pairing, score: number): Simulation {
  const initialScore = clampScore(score)
  const random = mulberry32(hashSeed(`${pairingId(pairing)}::${initialScore}`))
  const rounds: Round[] = []
  let liveScore = initialScore
  let leftTotal = 0
  let rightTotal = 0
  let leftPrev: Move | null = null
  let rightPrev: Move | null = null
  let leftDefectStreak = 0
  let rightDefectStreak = 0

  for (let index = 1; index <= ROUND_COUNT; index++) {
    const archetype = archetypeFor(liveScore)
    const policy = POLICIES[archetype]
    const scoreBefore = liveScore

    // Fixed four draws per Round keep the stream aligned and the run deterministic.
    const leftOlive = random()
    const leftDistrust = random()
    const rightOlive = random()
    const rightDistrust = random()

    const leftMove = applySlips(
      policy,
      policy.base(rightPrev, rightDefectStreak),
      leftOlive,
      leftDistrust,
    )
    const rightMove = applySlips(
      policy,
      policy.base(leftPrev, leftDefectStreak),
      rightOlive,
      rightDistrust,
    )

    const payoffs = payoffsFor(scoreBefore)
    const scored = scoreRound(leftMove, rightMove, payoffs)
    leftTotal = round2(leftTotal + scored.left)
    rightTotal = round2(rightTotal + scored.right)
    liveScore = drift(scoreBefore, leftMove, rightMove)

    rounds.push({
      index,
      archetype,
      leftMove,
      rightMove,
      leftPayoff: scored.left,
      rightPayoff: scored.right,
      leftTotal,
      rightTotal,
      scoreBefore,
      scoreAfter: liveScore,
    })

    leftPrev = leftMove
    rightPrev = rightMove
    leftDefectStreak = leftMove === "defect" ? leftDefectStreak + 1 : 0
    rightDefectStreak = rightMove === "defect" ? rightDefectStreak + 1 : 0
  }

  return {
    pairing,
    initialScore,
    rounds,
    finalScore: liveScore,
    verdict: verdictFor(rounds),
  }
}

/**
 * How an archetype plays a Round. All rules are deterministic; the two
 * probabilities inject reproducible, seed-driven humanmess:
 * — oliveBranch: chance of cooperating instead of retaliating (de-escalation)
 * — distrust: chance of defecting instead of cooperating (a wary slip)
 */
type Policy = {
  readonly archetype: StrategyArchetype
  readonly base: (opponentPrev: Move | null, opponentDefectStreak: number) => Move
  readonly oliveBranch: number
  readonly distrust: number
}

function mirror(opening: Move): Policy["base"] {
  return (opponentPrev) => opponentPrev ?? opening
}

const POLICIES: Record<StrategyArchetype, Policy> = {
  // 0–2: defects unconditionally.
  Aggressive: {
    archetype: "Aggressive",
    base: () => "defect",
    oliveBranch: 0,
    distrust: 0,
  },
  // 3–4: defects first, then mirrors; occasionally extends an olive branch.
  Suspicious: {
    archetype: "Suspicious",
    base: mirror("defect"),
    oliveBranch: 0.15,
    distrust: 0,
  },
  // 5–6: classic tit-for-tat — cooperates first, then mirrors — forgiving often and slipping rarely.
  Reciprocator: {
    archetype: "Reciprocator",
    base: mirror("cooperate"),
    oliveBranch: 0.25,
    distrust: 0.04,
  },
  // 7–8: cooperates, tolerating isolated defections; defects only after two in a row.
  "Cautious Cooperator": {
    archetype: "Cautious Cooperator",
    base: (_opponentPrev, opponentDefectStreak) =>
      opponentDefectStreak >= 2 ? "defect" : "cooperate",
    oliveBranch: 0,
    distrust: 0,
  },
  // 9–10: cooperates unconditionally.
  "Loyal Ally": {
    archetype: "Loyal Ally",
    base: () => "cooperate",
    oliveBranch: 0,
    distrust: 0,
  },
}

function applySlips(policy: Policy, base: Move, oliveRoll: number, distrustRoll: number): Move {
  if (base === "defect" && oliveRoll < policy.oliveBranch) return "cooperate"
  if (base === "cooperate" && distrustRoll < policy.distrust) return "defect"
  return base
}

function scoreRound(left: Move, right: Move, payoffs: TiltedPayoffs): { readonly left: number; readonly right: number } {
  if (left === "cooperate" && right === "cooperate") {
    return { left: payoffs.reward, right: payoffs.reward }
  }
  if (left === "defect" && right === "defect") {
    return { left: payoffs.punishment, right: payoffs.punishment }
  }
  return left === "cooperate"
    ? { left: payoffs.sucker, right: payoffs.temptation }
    : { left: payoffs.temptation, right: payoffs.sucker }
}

function clampScore(score: number): number {
  return round2(Math.min(10, Math.max(0, score)))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** FNV-1a — turns a (Pairing, score) into a stable PRNG seed. */
function hashSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32 — small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
