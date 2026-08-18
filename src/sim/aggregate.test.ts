import { describe, expect, it } from "vitest"
import { overallVerdict, overallVerdictFor } from "./aggregate"
import { simulate } from "./engine"
import { pairingOf } from "../domain/pairing"
import type { Country } from "../domain/country"

const country = (id: string, name: string): Country => ({ id, name })

describe("overallVerdict", () => {
  it("is PEACE only when every Pairing Verdict is PEACE", () => {
    expect(overallVerdict(["PEACE", "PEACE", "PEACE"])).toBe("PEACE")
    expect(overallVerdict(["PEACE"])).toBe("PEACE")
  })

  it("is WAR when any Pairing collapses to mutual defection", () => {
    expect(overallVerdict(["PEACE", "WAR", "PEACE"])).toBe("WAR")
    expect(overallVerdict(["WAR", "COLD WAR", "PEACE"])).toBe("WAR")
    expect(overallVerdict(["WAR"])).toBe("WAR")
  })

  it("is TENSION otherwise — cold wars without a hot one", () => {
    expect(overallVerdict(["COLD WAR", "COLD WAR", "COLD WAR"])).toBe("TENSION")
    expect(overallVerdict(["PEACE", "COLD WAR", "PEACE"])).toBe("TENSION")
    expect(overallVerdict(["COLD WAR"])).toBe("TENSION")
  })
})

describe("overallVerdictFor", () => {
  it("aggregates the Verdicts of complete simulations", () => {
    const a = country("032", "Argentina")
    const b = country("076", "Brazil")
    const c = country("152", "Chile")
    const sim = (left: Country, right: Country, score: number) =>
      simulate(pairingOf(left, right), score)

    expect(overallVerdictFor([sim(a, b, 10), sim(b, c, 10), sim(a, c, 10)])).toBe("PEACE")
    expect(overallVerdictFor([sim(a, b, 10), sim(b, c, 0), sim(a, c, 10)])).toBe("WAR")
    expect(overallVerdictFor([sim(a, b, 0)])).toBe("WAR")
  })
})
