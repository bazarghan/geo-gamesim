import { describe, expect, it } from "vitest"
import type { Country } from "./country"
import { canRunSimulation, isSelected, SELECTION_LIMIT, toggleCountry } from "./selection"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")
const japan = country("392", "Japan")
const brazil = country("076", "Brazil")

describe("toggleCountry", () => {
  it("selects an unselected country", () => {
    expect(toggleCountry([], iran)).toEqual([iran])
  })

  it("deselects a selected country", () => {
    expect(toggleCountry([iran, france], france)).toEqual([iran])
  })

  it("preserves selection order", () => {
    expect(toggleCountry([iran], france)).toEqual([iran, france])
    expect(toggleCountry([iran, france], japan)).toEqual([iran, france, japan])
  })

  it("ignores a fourth country once the selection is full", () => {
    const full = [iran, france, japan]
    expect(toggleCountry(full, brazil)).toEqual(full)
  })

  it("still allows deselecting while the selection is full", () => {
    const full = [iran, france, japan]
    expect(toggleCountry(full, france)).toEqual([iran, japan])
    expect(toggleCountry(toggleCountry(full, france), brazil)).toEqual([iran, japan, brazil])
  })

  it("honours a caller-supplied limit for conflict selections", () => {
    const withinLimit = [iran, france, japan, brazil]
    expect(toggleCountry(withinLimit, country("999", "Yemen"), 10)).toEqual([
      ...withinLimit,
      country("999", "Yemen"),
    ])
  })

  it("ignores selections above a caller-supplied limit", () => {
    const ten = [iran, france, japan, brazil]
    let over: readonly Country[] = ten
    for (let i = 0; over.length < 10; i++) {
      over = toggleCountry(over, country(`${i}00`, `Extra ${i}`), 10)
    }
    expect(over).toHaveLength(10)
    expect(toggleCountry(over, country("123", "Chile"), 10)).toEqual(over)
    expect(toggleCountry(over, iran, 10)).toEqual(over.filter((c) => c.id !== iran.id))
  })
})

describe("isSelected", () => {
  it("matches by country id, not by name", () => {
    expect(isSelected([iran], country("364", "Not Iran"))).toBe(true)
    expect(isSelected([iran], country("999", "Iran"))).toBe(false)
  })
})

describe("canRunSimulation", () => {
  it("is false with fewer than 2 countries selected", () => {
    expect(canRunSimulation([])).toBe(false)
    expect(canRunSimulation([iran])).toBe(false)
  })

  it("is true with 2 or 3 countries selected", () => {
    expect(canRunSimulation([iran, france])).toBe(true)
    expect(canRunSimulation([iran, france, japan])).toBe(true)
  })

  it("is never reachable above the selection limit", () => {
    expect(SELECTION_LIMIT).toBe(3)
  })
})
