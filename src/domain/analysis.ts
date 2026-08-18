import type { Country } from "./country"
import type { PayoffParametersResult } from "../llm/payoffCache"
import {
  findNashEquilibria,
  runMarl,
  type Alignment,
  type NashResult,
  type Party,
} from "./gameEngine"

/** A party in a scenario bundled with its LLM rationale (see CONTEXT.md, "Party"). */
export type AnalyzedParty = {
  readonly id: string
  readonly name: string
  readonly parameters: Party["parameters"]
  readonly rationale: string
}

/** A row of the Alignment table plus the point series for one party's chart line. */
export type AlignmentRow = {
  readonly id: string
  readonly name: string
  readonly alignment: Alignment
  readonly rationale: string
  readonly powerWeight: number
  /** One Alignment code per MARL episode, in episode order. */
  readonly series: readonly number[]
}

/** A point on the shared convergence chart: episode index plus every party's Alignment code. */
export type ConvergencePoint = {
  readonly episode: number
  /** One Alignment code per party id, so recharts can use each id as a series key. */
  readonly [partyId: string]: number
}

/** The complete, deterministic analysis of a Conflict Scenario. */
export type AnalysisResult = {
  /** Every party, in selection order, with its MARL-converged Alignment and rationale. */
  readonly rows: readonly AlignmentRow[]
  /** The pure-Nash engine output: equilibria, Pareto flags, and the fallback profile. */
  readonly nash: NashResult
  /** Whether `nash` found any equilibrium (when false the fallback is shown instead). */
  readonly hasEquilibrium: boolean
  /** Index into `nash.equilibria` of the one MARL converged to, or null when none. */
  readonly convergedEquilibriumIndex: number | null
  /** One point per MARL episode for the convergence chart. */
  readonly points: readonly ConvergencePoint[]
  /** The joint MARL-converged profile, in party order. */
  readonly convergedProfile: readonly Alignment[]
}

/**
 * Run the game engine over a scenario once every party has Payoff Parameters.
 * Fully deterministic: the same parties and parameters always yield the same
 * result, so the rendered Alignment table, equilibrium cards, and MARL chart
 * are stable across re-runs.
 */
export function analyzeScenario(
  countries: readonly Country[],
  results: Readonly<Record<string, PayoffParametersResult>>,
): AnalysisResult {
  const parties: Party[] = countries.map((country) => ({
    id: country.id,
    parameters: results[country.id].parameters,
  }))
  const analyzed: AnalyzedParty[] = countries.map((country) => ({
    id: country.id,
    name: country.name,
    parameters: results[country.id].parameters,
    rationale: results[country.id].rationale,
  }))

  const nash = findNashEquilibria(parties)
  const marl = runMarl(parties)

  const seriesByParty: number[][] = analyzed.map((party) =>
    marl.episodes.map((episode) => alignmentCode(episode.profile[analyzed.indexOf(party)])),
  )

  const points: ConvergencePoint[] = marl.episodes.map((episode) => {
    const point: Record<string, number> = { episode: episode.index }
    for (const party of analyzed) {
      point[party.id] = alignmentCode(episode.profile[analyzed.indexOf(party)])
    }
    return point as ConvergencePoint
  })

  const rows: AlignmentRow[] = analyzed.map((party, index) => ({
    id: party.id,
    name: party.name,
    alignment: marl.convergedProfile[index],
    rationale: party.rationale,
    powerWeight: party.parameters.powerWeight,
    series: seriesByParty[index],
  }))

  const convergedEquilibriumIndex = findProfileIndex(nash.equilibria, marl.convergedProfile)

  return {
    rows,
    nash,
    hasEquilibrium: nash.equilibria.length > 0,
    convergedEquilibriumIndex,
    points,
    convergedProfile: marl.convergedProfile,
  }
}

/** A stable numeric code per Alignment so the chart can plot category as a value. */
export function alignmentCode(alignment: Alignment): number {
  if (alignment === "SIDE A") return 2
  if (alignment === "NEUTRAL") return 1
  return 0
}

/** The Alignment label for a numeric chart code. */
export function alignmentLabel(code: number): string {
  if (code >= 2) return "SIDE A"
  if (code <= 0) return "SIDE B"
  return "NEUTRAL"
}

/** Index of the first equilibrium matching `profile`, or null when absent. */
function findProfileIndex(
  equilibria: readonly (readonly Alignment[])[],
  profile: readonly Alignment[],
): number | null {
  for (let i = 0; i < equilibria.length; i++) {
    const eq = equilibria[i]
    if (eq.length === profile.length && eq.every((a, j) => a === profile[j])) return i
  }
  return null
}
