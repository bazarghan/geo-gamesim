import type { Simulation, Verdict } from "./engine"

/** The aggregate classification of a whole run (see CONTEXT.md, "Verdict"). */
export type OverallVerdict = "PEACE" | "TENSION" | "WAR"

/**
 * Aggregate Pairing Verdicts into an Overall Verdict: PEACE if all pairs
 * cooperate, WAR if any pair collapses to mutual defection, otherwise
 * TENSION. No verdicts at all reads as TENSION — never a false PEACE.
 */
export function overallVerdict(verdicts: readonly Verdict[]): OverallVerdict {
  if (verdicts.length === 0) return "TENSION"
  if (verdicts.every((verdict) => verdict === "PEACE")) return "PEACE"
  if (verdicts.some((verdict) => verdict === "WAR")) return "WAR"
  return "TENSION"
}

/** The Overall Verdict of a run, from its completed simulations. */
export function overallVerdictFor(simulations: readonly Simulation[]): OverallVerdict {
  return overallVerdict(simulations.map((simulation) => simulation.verdict))
}

/** Presentation colors per Pairing Verdict — shared by panels and diagram. */
export const VERDICT_COLORS: Readonly<Record<Verdict, string>> = {
  PEACE: "#34d399",
  "COLD WAR": "#f5a524",
  WAR: "#f87171",
}
