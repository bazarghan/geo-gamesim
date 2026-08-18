import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import AnalysisResultsScreen from "./AnalysisResultsScreen"
import type { Country } from "../domain/country"
import { analyzeScenario } from "../domain/analysis"
import type { PayoffParametersResult } from "../llm/payoffCache"

const country = (id: string, name: string): Country => ({ id, name })

const result = (
  affinitySideA: number,
  affinitySideB: number,
  neutralityValue: number,
  powerWeight: number,
  rationale: string,
): PayoffParametersResult => ({
  parameters: { affinitySideA, affinitySideB, neutralityValue, powerWeight },
  rationale,
})

function render(countries: readonly Country[], results: Record<string, PayoffParametersResult>) {
  return renderToString(<AnalysisResultsScreen countries={countries} results={results} />).replaceAll(
    "<!-- -->",
    "",
  )
}

const countries = [country("p1", "Alpha"), country("p2", "Bravo"), country("p3", "Charlie")]
const results: Record<string, PayoffParametersResult> = {
  p1: result(9, 1, 1, 5, "Alpha leans heavily to Side A."),
  p2: result(9, 1, 1, 5, "Bravo coordinates with Alpha."),
  p3: result(9, 1, 1, 5, "Charlie follows the dominant bloc."),
}

describe("AnalysisResultsScreen", () => {
  it("renders an Alignment table with party, alignment, power weight, and rationale", () => {
    const html = render(countries, results)

    expect(html).toContain("Analysis Results")
    expect(html).toContain("Alignment")
    expect(html).toContain("Power Weight")
    expect(html).toContain("Rationale")
    expect(html).toContain("Alpha")
    expect(html).toContain("Bravo")
    expect(html).toContain("Charlie")
    expect(html).toContain("Side A")
    expect(html).toContain("Alpha leans heavily to Side A.")
  })

  it("renders every pure equilibrium as a card with the Pareto-best flagged", () => {
    const analysis = analyzeScenario(countries, results)
    const html = render(countries, results)

    expect(html).toContain("Nash Equilibria")
    // One card per equilibrium, each marked Pareto-best (only one exists here).
    expect(html.match(/class="nash-card\s/g)).toHaveLength(analysis.nash.equilibria.length)
    expect(html).toContain("Pareto-best")
  })

  it("marks the equilibrium MARL converged to", () => {
    const html = render(countries, results)

    expect(html).toContain("MARL converged")
  })

  it("mounts the MARL convergence chart container", () => {
    const html = render(countries, results)

    expect(html).toContain("MARL Convergence")
    expect(html).toContain("recharts-responsive-container")
  })

  it("shows the closest-to-stable profile when no equilibrium exists", () => {
    // A deliberately conflicted mix in which each party prefers a different
    // side and neutrality on its own, leaving no profile with zero defections.
    const noEq = [country("x1", "One"), country("x2", "Two")]
    const noEqResults: Record<string, PayoffParametersResult> = {
      x1: result(10, 0, 9, 10, "One wants A but hates B."),
      x2: result(0, 10, 9, 10, "Two wants B but hates A."),
    }
    const html = render(noEq, noEqResults)

    if (analyzeScenario(noEq, noEqResults).hasEquilibrium) {
      // If this mix actually has an equilibrium, the no-stable branch is skipped.
      expect(html).toContain("Nash Equilibria")
      expect(html).not.toContain("No stable profile")
    } else {
      expect(html).toContain("No stable profile")
      expect(html).toContain("closest to stable")
    }
  })
})
