import { describe, expect, it } from "vitest"
import {
  clampPayoffParameters,
  closestToStable,
  enumerateProfiles,
  findNashEquilibria,
  payoffs,
  runMarl,
  type Party,
} from "./gameEngine"

const party = (
  id: string,
  affinitySideA: number,
  affinitySideB: number,
  neutralityValue: number,
  powerWeight: number,
): Party => ({
  id,
  parameters: { affinitySideA, affinitySideB, neutralityValue, powerWeight },
})

describe("Payoff Parameters clamping", () => {
  it("clamps every field to the 0–10 glossary semantics", () => {
    expect(
      clampPayoffParameters({
        affinitySideA: -3,
        affinitySideB: 12,
        neutralityValue: 5,
        powerWeight: 100,
      }),
    ).toEqual({ affinitySideA: 0, affinitySideB: 10, neutralityValue: 5, powerWeight: 10 })
  })

  it("leaves in-range values untouched and rounds to two decimals", () => {
    expect(
      clampPayoffParameters({
        affinitySideA: 9.123,
        affinitySideB: 4.5,
        neutralityValue: 2,
        powerWeight: 7.777,
      }),
    ).toEqual({ affinitySideA: 9.12, affinitySideB: 4.5, neutralityValue: 2, powerWeight: 7.78 })
  })
})

describe("Payoff formula", () => {
  // Two equal-power parties, both drawn to a side: (9,9,2,5).
  const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]

  it("scores joining a side as affinity + power-share of the bloc − war cost", () => {
    // Both on Side A: the side holds all 10 of 10 power → full bloc benefit.
    expect(payoffs(two, ["SIDE A", "SIDE A"])).toEqual([14, 14]) // 9 + 10 − 5
    // One joins Side A alone (half of total power) → half bloc benefit.
    expect(payoffs(two, ["SIDE A", "NEUTRAL"])).toEqual([9, 7]) // 9 + 5 − 5 ; 2 + 5
    // One goes to each side: each commands half the power.
    expect(payoffs(two, ["SIDE A", "SIDE B"])).toEqual([9, 9])
  })

  it("scores neutrality as neutrality value + power safety", () => {
    expect(payoffs(two, ["NEUTRAL", "NEUTRAL"])).toEqual([7, 7]) // 2 + 1*5
    // A zero-power party gains no safety from neutrality.
    const weak = [party("p1", 9, 9, 2, 0), party("p2", 1, 1, 2, 5)]
    expect(payoffs(weak, ["NEUTRAL", "NEUTRAL"])).toEqual([2, 7])
  })

  it("uses the side-specific affinity the party joins", () => {
    const skewed = [party("p1", 8, 2, 1, 5), party("p2", 2, 8, 1, 5)]
    // Both on Side A: p1 gains from its 8-affinity to A, p2 only from its 2.
    expect(payoffs(skewed, ["SIDE A", "SIDE A"])).toEqual([13, 7]) // 8+10−5 ; 2+10−5
    // Split across sides, each is the sole member of its side (half of power).
    expect(payoffs(skewed, ["SIDE A", "SIDE B"])).toEqual([8, 8]) // 8+5−5 ; 8+5−5
  })
})

describe("Exact profile enumeration", () => {
  it("enumerates all 3^n unique profiles for a scenario", () => {
    const three = [
      party("p1", 9, 1, 1, 5),
      party("p2", 9, 1, 1, 5),
      party("p3", 9, 1, 1, 5),
    ]
    const profiles = enumerateProfiles(three)
    expect(profiles.length).toBe(27) // 3^3
    expect(new Set(profiles.map((p) => p.join("|"))).size).toBe(27)
  })

  it("finds every pure Nash Equilibrium in a 2-party coordination game", () => {
    const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]
    const result = findNashEquilibria(two)
    // No party can improve by leaving a shared side; both shared outcomes are stable.
    expect(result.equilibria).toEqual([
      ["SIDE A", "SIDE A"],
      ["SIDE B", "SIDE B"],
    ])
  })

  it("finds the single pure Nash Equilibrium in a 3-party game", () => {
    const three = [
      party("p1", 9, 1, 1, 5),
      party("p2", 9, 1, 1, 5),
      party("p3", 9, 1, 1, 5),
    ]
    const result = findNashEquilibria(three)
    expect(result.equilibria).toEqual([["SIDE A", "SIDE A", "SIDE A"]])
  })
})

describe("Pareto-best flag", () => {
  it("flags both shared-side equilibria as Pareto-optimal in the symmetric game", () => {
    const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]
    const result = findNashEquilibria(two)
    expect(result.paretoOptimal).toEqual([true, true])
    expect(result.paretoBest).toBe(0)
  })

  it("flags the sole equilibrium of the 3-party game as Pareto-best", () => {
    const three = [
      party("p1", 9, 1, 1, 5),
      party("p2", 9, 1, 1, 5),
      party("p3", 9, 1, 1, 5),
    ]
    const result = findNashEquilibria(three)
    expect(result.paretoOptimal).toEqual([true])
    expect(result.paretoBest).toBe(0)
  })
})

describe("No-equilibrium fallback / closest to stable", () => {
  it("returns the profile with fewest unilateral defections", () => {
    const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]
    // The symmetric game has a pure equilibrium, so the closest-to-stable
    // profile has zero defections and is itself that equilibrium.
    const stable = closestToStable(two)
    expect(stable.defections).toBe(0)
    expect(stable.profile).toEqual(["SIDE A", "SIDE A"])
  })

  it("keeps the fallback dormant whenever an equilibrium exists", () => {
    const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]
    const result = findNashEquilibria(two)
    expect(result.fallback).toBeNull()
    expect(result.fallbackDefections).toBe(0)
  })

  it("consistently derives the fallback from closest-to-stable for degenerate inputs", () => {
    // A single party can never have no best response… but for a lone party the
    // engine still reports its one stable outcome rather than failing.
    const solo = [party("p1", 9, 1, 1, 5)]
    const result = findNashEquilibria(solo)
    expect(result.equilibria).toHaveLength(1)
    expect(result.fallback).toBeNull()
  })
})

describe("MARL equilibrium selection", () => {
  it("converges to an equilibrium and records per-episode history", () => {
    const three = [
      party("p1", 9, 1, 1, 5),
      party("p2", 9, 1, 1, 5),
      party("p3", 9, 1, 1, 5),
    ]
    const result = runMarl(three)
    expect(result.episodes.length).toBe(1000)
    expect(result.episodes[0].index).toBe(0)
    expect(result.episodes[999].index).toBe(999)
    // Converges to the single pure Nash Equilibrium of the game.
    expect(result.convergedProfile).toEqual(["SIDE A", "SIDE A", "SIDE A"])
    expect(result.convergedEquilibrium).toEqual(["SIDE A", "SIDE A", "SIDE A"])
  })

  it("is deterministic — identical inputs produce identical results", () => {
    const three = [
      party("p1", 9, 1, 1, 5),
      party("p2", 9, 1, 1, 5),
      party("p3", 9, 1, 1, 5),
    ]
    const runA = runMarl(three)
    const runB = runMarl(three)
    expect(runA.convergedProfile).toEqual(runB.convergedProfile)
    expect(runA.convergedEquilibrium).toEqual(runB.convergedEquilibrium)
    expect(runA.episodes).toEqual(runB.episodes)
  })

  it("still converges to an equilibrium in the 2-party coordination game", () => {
    const two = [party("p1", 9, 9, 2, 5), party("p2", 9, 9, 2, 5)]
    const result = runMarl(two)
    // Both shared-side equilibria are valid outcomes; the run must land on one.
    expect([
      ["SIDE A", "SIDE A"],
      ["SIDE B", "SIDE B"],
    ]).toContainEqual(result.convergedProfile)
    expect(result.convergedEquilibrium).toEqual(result.convergedProfile)
  })
})
