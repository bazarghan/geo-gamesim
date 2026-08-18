import { describe, expect, it } from "vitest"
import { analyzeScenario, alignmentCode, alignmentLabel } from "./analysis"
import type { Country } from "./country"
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

describe("analyzeScenario", () => {
  // The 3-party game from the engine tests: all strongly drawn to Side A, so
  // the single pure equilibrium is everyone aligned to Side A.
  const countries = [country("p1", "Alpha"), country("p2", "Bravo"), country("p3", "Charlie")]
  const results: Record<string, PayoffParametersResult> = {
    p1: result(9, 1, 1, 5, "Alpha rationale"),
    p2: result(9, 1, 1, 5, "Bravo rationale"),
    p3: result(9, 1, 1, 5, "Charlie rationale"),
  }

  it("builds an Alignment table row per party with alignment, rationale, and power weight", () => {
    const analysis = analyzeScenario(countries, results)

    expect(analysis.rows).toHaveLength(3)
    expect(analysis.rows[0]).toMatchObject({
      id: "p1",
      name: "Alpha",
      alignment: "SIDE A",
      rationale: "Alpha rationale",
      powerWeight: 5,
    })
    expect(analysis.rows.map((row) => row.alignment)).toEqual([
      "SIDE A",
      "SIDE A",
      "SIDE A",
    ])
  })

  it("reports the pure Nash equilibrium and flags it as Pareto-best", () => {
    const analysis = analyzeScenario(countries, results)

    expect(analysis.hasEquilibrium).toBe(true)
    expect(analysis.nash.equilibria).toEqual([["SIDE A", "SIDE A", "SIDE A"]])
    expect(analysis.nash.paretoOptimal).toEqual([true])
    expect(analysis.nash.paretoBest).toBe(0)
    expect(analysis.nash.fallback).toBeNull()
  })

  it("identifies which equilibrium MARL converged to", () => {
    const analysis = analyzeScenario(countries, results)

    expect(analysis.convergedProfile).toEqual(["SIDE A", "SIDE A", "SIDE A"])
    expect(analysis.convergedEquilibriumIndex).toBe(0)
  })

  it("produces one convergence point per episode with every party's Alignment code", () => {
    const analysis = analyzeScenario(countries, results)

    expect(analysis.points).toHaveLength(1000)
    expect(analysis.points[0].episode).toBe(0)
    expect(analysis.points[999].episode).toBe(999)
    const point = analysis.points[999]
    expect(point.p1).toBe(2) // SIDE A
    expect(point.p2).toBe(2)
    expect(point.p3).toBe(2)
    expect(analysis.rows[0].series).toHaveLength(1000)
  })

  it("is deterministic — identical inputs produce identical analyses", () => {
    const a = analyzeScenario(countries, results)
    const b = analyzeScenario(countries, results)

    expect(a).toEqual(b)
  })
})

describe("alignment codes", () => {
  it("maps each Alignment to a stable numeric code and back", () => {
    expect(alignmentCode("SIDE A")).toBe(2)
    expect(alignmentCode("NEUTRAL")).toBe(1)
    expect(alignmentCode("SIDE B")).toBe(0)

    expect(alignmentLabel(2)).toBe("SIDE A")
    expect(alignmentLabel(1)).toBe("NEUTRAL")
    expect(alignmentLabel(0)).toBe("SIDE B")
  })
})
