import { describe, expect, it } from "vitest"
import type { Country } from "./country"
import {
  belligerents,
  BELLIGERENT_COUNT,
  canRunConflictAnalysis,
  CONFLICT_LIMIT,
  isBelligerent,
  parties,
  roleForIndex,
} from "./conflict"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")
const japan = country("392", "Japan")
const brazil = country("076", "Brazil")

describe("roleForIndex", () => {
  it("marks the first two selections as belligerents", () => {
    expect(roleForIndex(0)).toBe("belligerent")
    expect(roleForIndex(1)).toBe("belligerent")
  })

  it("marks every later selection as a party", () => {
    expect(roleForIndex(2)).toBe("party")
    expect(roleForIndex(9)).toBe("party")
  })
})

describe("role split", () => {
  it("splits a selection into two belligerents and the rest as parties", () => {
    const selected = [iran, france, japan, brazil]
    expect(belligerents(selected)).toEqual([iran, france])
    expect(parties(selected)).toEqual([japan, brazil])
  })

  it("has no parties with exactly two selections", () => {
    expect(parties([iran, france])).toEqual([])
  })
})

describe("isBelligerent", () => {
  it("matches by country id among the first two selections", () => {
    expect(isBelligerent([iran, france, japan], iran)).toBe(true)
    expect(isBelligerent([iran, france, japan], france)).toBe(true)
    expect(isBelligerent([iran, france, japan], japan)).toBe(false)
    expect(isBelligerent([], iran)).toBe(false)
  })
})

describe("canRunConflictAnalysis", () => {
  it("is false until both belligerents and one further party are selected", () => {
    expect(canRunConflictAnalysis([])).toBe(false)
    expect(canRunConflictAnalysis([iran])).toBe(false)
    expect(canRunConflictAnalysis([iran, france])).toBe(false)
  })

  it("is true from two belligerents plus one party up to the conflict limit", () => {
    expect(canRunConflictAnalysis([iran, france, japan])).toBe(true)
    expect(canRunConflictAnalysis([iran, france, japan, brazil])).toBe(true)
  })

  it("is unreachable above the conflict limit", () => {
    const many: Country[] = Array.from({ length: CONFLICT_LIMIT + 1 }, (_, i) =>
      country(String(i), `Country ${i}`),
    )
    expect(canRunConflictAnalysis(many.slice(0, CONFLICT_LIMIT))).toBe(true)
    expect(canRunConflictAnalysis(many)).toBe(false)
    expect(CONFLICT_LIMIT).toBe(10)
    expect(BELLIGERENT_COUNT).toBe(2)
  })
})