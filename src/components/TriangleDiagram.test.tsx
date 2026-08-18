import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import TriangleDiagram from "./TriangleDiagram"
import { simulate } from "../sim/engine"
import { VERDICT_COLORS } from "../sim/aggregate"
import { pairingOf } from "../domain/pairing"
import type { Country } from "../domain/country"

const country = (id: string, name: string): Country => ({ id, name })
const france = country("250", "France")
const iran = country("364", "Iran")
const china = country("156", "China")
const countries = [france, iran, china]

function simOf(a: Country, b: Country, score: number) {
  return simulate(pairingOf(a, b), score)
}

function diagram(scores: readonly [number, number, number]) {
  // Scores line up with Pairings in canonical (pairingsFor) order: F–I, F–C, I–C.
  const simulations = [
    simOf(france, iran, scores[0]),
    simOf(france, china, scores[1]),
    simOf(iran, china, scores[2]),
  ]
  return renderToString(<TriangleDiagram countries={countries} simulations={simulations} />)
}

describe("TriangleDiagram", () => {
  it("places the three countries as labeled vertices", () => {
    const html = diagram([10, 10, 10])

    expect(html).toContain("France")
    expect(html).toContain("Iran")
    expect(html).toContain("China")
  })

  it("draws one edge per Pairing, colored by its Verdict", () => {
    const html = diagram([10, 0, 10])

    expect(html.match(/<line /g)).toHaveLength(3)
    expect(html).toContain(`stroke="${VERDICT_COLORS.PEACE}"`)
    expect(html).toContain(`stroke="${VERDICT_COLORS.WAR}"`)
  })

  it("labels each edge with its Pairing and Verdict", () => {
    const html = diagram([10, 0, 10])

    // Pairings render in canonical (alphabetical) name order.
    expect(html).toContain("France — Iran: PEACE")
    expect(html).toContain("China — France: WAR")
    expect(html).toContain("China — Iran: PEACE")
  })

  it("colors every edge with the color of its own simulation's Verdict", () => {
    const simulations = [simOf(france, iran, 10), simOf(france, china, 10), simOf(iran, china, 10)]
    const html = renderToString(<TriangleDiagram countries={countries} simulations={simulations} />)

    for (const simulation of simulations) {
      expect(html).toContain(`stroke="${VERDICT_COLORS[simulation.verdict]}"`)
    }
  })
})
