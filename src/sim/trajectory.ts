import type { Round, Simulation } from "./engine"
import { moveVerb } from "../i18n"

/** How a Round's moves combine — drives the trajectory's move-strip color. */
export type Outcome = "mutual cooperation" | "mixed" | "mutual defection"

/** One chart point: the drifting score plus the round's outcome strip. */
export type TrajectoryDatum = {
  readonly round: number
  readonly score: number
  readonly move: number
  readonly outcome: Outcome
  readonly detail: string
}

export const OUTCOME_COLORS: Readonly<Record<Outcome, string>> = {
  "mutual cooperation": "#34d399",
  mixed: "#f5a524",
  "mutual defection": "#f87171",
}

export function outcomeOf(round: Round): Outcome {
  if (round.leftMove === "cooperate" && round.rightMove === "cooperate") return "mutual cooperation"
  if (round.leftMove === "defect" && round.rightMove === "defect") return "mutual defection"
  return "mixed"
}

/** Points revealed so far — the playback position drives how much of the story the chart shows. */
export function trajectoryData(simulation: Simulation, currentRound: number): readonly TrajectoryDatum[] {
  return simulation.rounds.slice(0, currentRound).map((round) => ({
    round: round.index,
    score: round.scoreAfter,
    move: 1,
    outcome: outcomeOf(round),
    detail: detailFor(simulation, round),
  }))
}

/** Human-readable summary of one Round, shown in the tooltip and readout. */
export function detailFor(simulation: Simulation, round: Round): string {
  const { left, right } = simulation.pairing
  return `${left.name} ${moveVerb(round.leftMove)}, ${right.name} ${moveVerb(round.rightMove)}`
}
