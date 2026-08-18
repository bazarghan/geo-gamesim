import { describe, expect, it } from "vitest"
import { outcomeOf, trajectoryData, OUTCOME_COLORS } from "./trajectory"
import { simulate, type Round } from "./engine"
import type { Pairing } from "../domain/pairing"

const country = (id: string, name: string) => ({ id, name })
const pairing: Pairing = { left: country("250", "France"), right: country("364", "Iran") }

describe("outcomeOf", () => {
  const round = (leftMove: "cooperate" | "defect", rightMove: "cooperate" | "defect"): Round => ({
    index: 1,
    archetype: "Reciprocator",
    leftMove,
    rightMove,
    leftPayoff: 3,
    rightPayoff: 3,
    leftTotal: 3,
    rightTotal: 3,
    scoreBefore: 5,
    scoreAfter: 5,
  })

  it("classifies each round's combination of moves", () => {
    expect(outcomeOf(round("cooperate", "cooperate"))).toBe("mutual cooperation")
    expect(outcomeOf(round("defect", "defect"))).toBe("mutual defection")
    expect(outcomeOf(round("cooperate", "defect"))).toBe("mixed")
    expect(outcomeOf(round("defect", "cooperate"))).toBe("mixed")
  })

  it("colors each outcome distinctly", () => {
    const colors = new Set(Object.values(OUTCOME_COLORS))
    expect(colors).toHaveLength(3)
  })
})

describe("trajectoryData", () => {
  it("reveals only the rounds the playback has reached", () => {
    const simulation = simulate(pairing, 4)
    expect(trajectoryData(simulation, 1)).toHaveLength(1)
    expect(trajectoryData(simulation, 17)).toHaveLength(17)
    expect(trajectoryData(simulation, 50)).toHaveLength(50)
  })

  it("carries the drifting score and a per-round move summary", () => {
    const simulation = simulate(pairing, 4)
    const data = trajectoryData(simulation, 50)
    expect(data[0].round).toBe(1)
    expect(data[49].score).toBe(simulation.finalScore)
    expect(data[0].detail).toContain("France")
    expect(data[0].detail).toContain("Iran")
    expect(data[0].detail).toMatch(/همکاری می‌کند|تخلف می‌کند/)
  })
})
