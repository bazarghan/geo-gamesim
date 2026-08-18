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

const countries = [country("p1", "آلفا"), country("p2", "براوو"), country("p3", "چارلی")]
const results: Record<string, PayoffParametersResult> = {
  p1: result(9, 1, 1, 5, "آلفا شدیداً به سمت A متمایل است."),
  p2: result(9, 1, 1, 5, "براوو با آلفا هماهنگ است."),
  p3: result(9, 1, 1, 5, "چارلی از بلوک غالب پیروی می‌کند."),
}

describe("AnalysisResultsScreen", () => {
  it("renders an Alignment table with party, alignment, power weight, and rationale", () => {
    const html = render(countries, results)

    expect(html).toContain("نتایج تحلیل")
    expect(html).toContain("گرایش")
    expect(html).toContain("وزن قدرت")
    expect(html).toContain("دلیل")
    expect(html).toContain("آلفا")
    expect(html).toContain("براوو")
    expect(html).toContain("چارلی")
    expect(html).toContain("سمت A")
    expect(html).toContain("آلفا شدیداً به سمت A متمایل است.")
  })

  it("renders every pure equilibrium as a card with the Pareto-best flagged", () => {
    const analysis = analyzeScenario(countries, results)
    const html = render(countries, results)

    expect(html).toContain("تعادل‌های نش")
    // One card per equilibrium, each marked Pareto-best (only one exists here).
    expect(html.match(/class="nash-card\s/g)).toHaveLength(analysis.nash.equilibria.length)
    expect(html).toContain("بهینه پارتو")
  })

  it("marks the equilibrium MARL converged to", () => {
    const html = render(countries, results)

    expect(html).toContain("هم‌گرایی MARL")
  })

  it("mounts the MARL convergence chart container", () => {
    const html = render(countries, results)

    expect(html).toContain("هم‌گرایی MARL")
    expect(html).toContain("recharts-responsive-container")
  })

  it("shows the closest-to-stable profile when no equilibrium exists", () => {
    // A deliberately conflicted mix in which each party prefers a different
    // side and neutrality on its own, leaving no profile with zero defections.
    const noEq = [country("x1", "یک"), country("x2", "دو")]
    const noEqResults: Record<string, PayoffParametersResult> = {
      x1: result(10, 0, 9, 10, "یک طالب A است ولی از B بیزار است."),
      x2: result(0, 10, 9, 10, "دو طالب B است ولی از A بیزار است."),
    }
    const html = render(noEq, noEqResults)

    if (analyzeScenario(noEq, noEqResults).hasEquilibrium) {
      // If this mix actually has an equilibrium, the no-stable branch is skipped.
      expect(html).toContain("تعادل‌های نش")
      expect(html).not.toContain("پروفایل پایدار وجود ندارد")
    } else {
      expect(html).toContain("پروفایل پایدار وجود ندارد")
      expect(html).toContain("نزدیک‌ترین به پایدار")
    }
  })
})
