import { describe, expect, it } from "vitest"
import {
  archetypeFor,
  drift,
  payoffsFor,
  ROUND_COUNT,
  simulate,
  verdictFor,
  type Move,
  type Round,
} from "./engine"
import type { Pairing } from "../domain/pairing"

const country = (id: string, name: string) => ({ id, name })
const iran = country("364", "Iran")
const france = country("250", "France")
const pairing: Pairing = { left: france, right: iran }

describe("archetypeFor thresholds", () => {
  it("maps the whole 0–10 range by CONTEXT.md thresholds", () => {
    expect(archetypeFor(0)).toBe("Aggressive")
    expect(archetypeFor(2)).toBe("Aggressive")
    expect(archetypeFor(3)).toBe("Suspicious")
    expect(archetypeFor(4)).toBe("Suspicious")
    expect(archetypeFor(5)).toBe("Reciprocator")
    expect(archetypeFor(6)).toBe("Reciprocator")
    expect(archetypeFor(7)).toBe("Cautious Cooperator")
    expect(archetypeFor(8)).toBe("Cautious Cooperator")
    expect(archetypeFor(9)).toBe("Loyal Ally")
    expect(archetypeFor(10)).toBe("Loyal Ally")
  })

  it("handles drifted fractional scores", () => {
    expect(archetypeFor(2.05)).toBe("Suspicious")
    expect(archetypeFor(4.5)).toBe("Reciprocator")
    expect(archetypeFor(4.99)).toBe("Reciprocator")
    expect(archetypeFor(6.5)).toBe("Cautious Cooperator")
    expect(archetypeFor(8.01)).toBe("Loyal Ally")
  })
})

describe("tilted payoff matrix", () => {
  it("tilts T and R by the score: T=5−0.2s, R=3+0.2s, P=1, S=0", () => {
    expect(payoffsFor(0)).toEqual({ temptation: 5, reward: 3, punishment: 1, sucker: 0 })
    expect(payoffsFor(10)).toEqual({ temptation: 3, reward: 5, punishment: 1, sucker: 0 })
    expect(payoffsFor(2.5)).toEqual({ temptation: 4.5, reward: 3.5, punishment: 1, sucker: 0 })
  })
})

describe("drift", () => {
  it("raises the score with cooperation and lowers it with defection", () => {
    const cooperate: Move = "cooperate"
    const defect: Move = "defect"
    expect(drift(5, cooperate, cooperate)).toBeGreaterThan(5)
    expect(drift(5, defect, defect)).toBeLessThan(5)
    expect(drift(5, cooperate, defect)).toBe(5)
  })

  it("clamps the live score to 0–10", () => {
    expect(drift(0, "defect", "defect")).toBe(0)
    expect(drift(10, "cooperate", "cooperate")).toBe(10)
  })
})

describe("verdictFor", () => {
  const round = (left: Move, right: Move): Round => ({
    index: 1,
    archetype: "Reciprocator",
    leftMove: left,
    rightMove: right,
    leftPayoff: 3,
    rightPayoff: 3,
    leftTotal: 3,
    rightTotal: 3,
    scoreBefore: 5,
    scoreAfter: 5,
  })

  it("calls mutual cooperation in the final window PEACE", () => {
    const rounds = [...Array(40).fill(round("defect", "defect")), ...Array(10).fill(round("cooperate", "cooperate"))]
    expect(verdictFor(rounds)).toBe("PEACE")
  })

  it("calls mutual defection in the final window WAR", () => {
    const rounds = [...Array(40).fill(round("cooperate", "cooperate")), ...Array(10).fill(round("defect", "defect"))]
    expect(verdictFor(rounds)).toBe("WAR")
  })

  it("calls anything mixed or exploitative COLD WAR", () => {
    const mixed = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? round("cooperate", "defect") : round("defect", "cooperate")))
    expect(verdictFor(mixed)).toBe("COLD WAR")
  })

  it("ignores rounds outside the final 10-round window", () => {
    const rounds = [
      ...Array(10).fill(round("defect", "cooperate")),
      ...Array(10).fill(round("cooperate", "cooperate")),
    ]
    expect(verdictFor(rounds)).toBe("PEACE")
  })
})

describe("simulate", () => {
  it("computes all 50 rounds instantly and deterministically", () => {
    const first = simulate(pairing, 4)
    const second = simulate(pairing, 4)

    expect(first.rounds).toHaveLength(ROUND_COUNT)
    expect(first.rounds.map((round) => round.index)).toEqual(
      Array.from({ length: ROUND_COUNT }, (_, i) => i + 1),
    )
    expect(second).toEqual(first)
  })

  it("chains the drifting score across rounds", () => {
    const { rounds } = simulate(pairing, 6)
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].scoreBefore).toBe(rounds[i - 1].scoreAfter)
    }
  })

  it("keeps every score and move within bounds", () => {
    const { rounds } = simulate(pairing, 5)
    for (const round of rounds) {
      expect(round.scoreBefore).toBeGreaterThanOrEqual(0)
      expect(round.scoreAfter).toBeLessThanOrEqual(10)
      expect(["cooperate", "defect"]).toContain(round.leftMove)
      expect(["cooperate", "defect"]).toContain(round.rightMove)
    }
  })

  it("scores each round against the tilted matrix at the round's live score", () => {
    const { rounds } = simulate(pairing, 7)
    for (const round of rounds) {
      const { temptation, reward, punishment, sucker } = payoffsFor(round.scoreBefore)
      const pair = `${round.leftMove}/${round.rightMove}`
      if (pair === "cooperate/cooperate") {
        expect(round.leftPayoff).toBe(reward)
        expect(round.rightPayoff).toBe(reward)
      } else if (pair === "defect/defect") {
        expect(round.leftPayoff).toBe(punishment)
        expect(round.rightPayoff).toBe(punishment)
      } else if (pair === "cooperate/defect") {
        expect(round.leftPayoff).toBe(sucker)
        expect(round.rightPayoff).toBe(temptation)
      } else {
        expect(round.leftPayoff).toBe(temptation)
        expect(round.rightPayoff).toBe(sucker)
      }
      // Payoffs accumulate as running totals.
      expect(round.leftTotal).toBeCloseTo(
        rounds.slice(0, round.index).reduce((sum, r) => sum + r.leftPayoff, 0),
        5,
      )
    }
  })

  it("plays a Loyal Ally pair (9–10) into PEACE with pure cooperation", () => {
    const sim = simulate(pairing, 10)
    expect(sim.rounds.every((round) => round.leftMove === "cooperate" && round.rightMove === "cooperate")).toBe(true)
    expect(sim.verdict).toBe("PEACE")
    expect(sim.finalScore).toBe(10)
  })

  it("plays an Aggressive pair (0–2) into WAR with pure defection and a drained score", () => {
    const sim = simulate(pairing, 0)
    expect(sim.rounds.every((round) => round.leftMove === "defect" && round.rightMove === "defect")).toBe(true)
    expect(sim.verdict).toBe("WAR")
    expect(sim.finalScore).toBe(0)
    expect(sim.rounds[0].archetype).toBe("Aggressive")
  })

  it("derives Suspicious archetypes from the initial score and keeps the seed story stable across runs", () => {
    const sim = simulate(pairing, 4)
    expect(sim.rounds[0].archetype).toBe("Suspicious")
    // The story depends on the pairing (seed), not on when it is recomputed.
    expect(simulate({ left: france, right: iran }, 4).rounds[0]).toEqual(sim.rounds[0])
  })

  it("clamps an out-of-range input score", () => {
    expect(simulate(pairing, 42).initialScore).toBe(10)
    expect(simulate(pairing, -3).initialScore).toBe(0)
  })
})
