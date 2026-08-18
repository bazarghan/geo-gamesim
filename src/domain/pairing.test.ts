import { describe, expect, it } from "vitest"
import type { Country } from "./country"
import { pairingOf, pairingsFor } from "./pairing"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")
const japan = country("392", "Japan")

describe("pairingsFor", () => {
  it("produces no Pairings for fewer than two countries", () => {
    expect(pairingsFor([])).toEqual([])
    expect(pairingsFor([iran])).toEqual([])
  })

  it("produces exactly one Pairing for two countries", () => {
    expect(pairingsFor([iran, france])).toEqual([{ left: france, right: iran }])
  })

  it("produces three Pairings for three countries", () => {
    expect(pairingsFor([iran, france, japan])).toHaveLength(3)
  })

  it("produces distinct pairs for three countries", () => {
    const keys = pairingsFor([iran, france, japan]).map((p) => `${p.left.name}|${p.right.name}`)
    expect(new Set(keys).size).toBe(3)
    expect(keys).toContain("France|Iran")
    expect(keys).toContain("Iran|Japan")
    expect(keys).toContain("France|Japan")
  })
})

describe("pairingOf", () => {
  it("is symmetric — a Pairing is an unordered pair", () => {
    expect(pairingOf(iran, france)).toEqual(pairingOf(france, iran))
  })

  it("orders members canonically by name", () => {
    expect(pairingOf(iran, france)).toEqual({ left: france, right: iran })
  })

  it("makes pairingsFor order-independent", () => {
    expect(pairingsFor([iran, france, japan])).toEqual(pairingsFor([japan, france, iran]))
  })
})
