import { describe, expect, it } from "vitest"
import {
  clearPayoffCache,
  getCachedPayoff,
  PAYOFF_CACHE_STORAGE_KEY,
  payoffCacheKey,
  saveCachedPayoff,
  scenarioKey,
} from "./payoffCache"
import { createMemoryStorage } from "../settings/settings"

const result = {
  parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
  rationale: "Firmly on the regional bloc's side.",
}

describe("scenarioKey", () => {
  it("is independent of selection order", () => {
    expect(scenarioKey(["364", "250", "392"])).toBe(scenarioKey(["392", "250", "364"]))
  })
})

describe("payoffCacheKey", () => {
  it("is keyed by model, scenario and party", () => {
    const scenario = scenarioKey(["364", "250", "392"])
    expect(payoffCacheKey("gpt-4o", scenario, "364")).not.toBe(
      payoffCacheKey("llama3", scenario, "364"),
    )
    expect(payoffCacheKey("gpt-4o", scenario, "364")).not.toBe(
      payoffCacheKey("gpt-4o", scenario, "250"),
    )
  })
})

describe("cached payoff results", () => {
  it("returns null before anything is cached and the result after saving", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])

    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toBeNull()

    saveCachedPayoff(storage, "gpt-4o", scenario, "364", result)
    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toEqual(result)
  })

  it("caches per (model, scenario, party) — each dimension re-queries separately", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])

    saveCachedPayoff(storage, "gpt-4o", scenario, "364", result)

    expect(getCachedPayoff(storage, "llama3", scenario, "364")).toBeNull()
    expect(getCachedPayoff(storage, "gpt-4o", scenarioKey(["364", "250"]), "364")).toBeNull()
    expect(getCachedPayoff(storage, "gpt-4o", scenario, "250")).toBeNull()
  })

  it("persists through the underlying storage", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])

    saveCachedPayoff(storage, "gpt-4o", scenario, "364", result)

    expect(JSON.parse(storage.getItem(PAYOFF_CACHE_STORAGE_KEY) ?? "{}")).toEqual({
      [payoffCacheKey("gpt-4o", scenario, "364")]: result,
    })
  })
})

describe("clearPayoffCache", () => {
  it("wipes cached payoff results but leaves other storage alone", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])
    storage.setItem("geo-gamesim.settings", "{}")
    saveCachedPayoff(storage, "gpt-4o", scenario, "364", result)

    clearPayoffCache(storage)

    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toBeNull()
    expect(storage.getItem(PAYOFF_CACHE_STORAGE_KEY)).toBeNull()
    expect(storage.getItem("geo-gamesim.settings")).toBe("{}")
  })
})

describe("malformed payoff cache blobs", () => {
  it("treats corrupt JSON as empty and keeps saving afterwards", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])
    storage.setItem(PAYOFF_CACHE_STORAGE_KEY, "{not json")

    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toBeNull()

    saveCachedPayoff(storage, "gpt-4o", scenario, "364", result)
    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toEqual(result)
  })

  it("ignores invalid entries when loading", () => {
    const storage = createMemoryStorage()
    const scenario = scenarioKey(["364", "250", "392"])
    storage.setItem(
      PAYOFF_CACHE_STORAGE_KEY,
      JSON.stringify({
        [payoffCacheKey("gpt-4o", scenario, "364")]: {
          parameters: { affinitySideA: 99 },
          rationale: "out of range",
        },
        [payoffCacheKey("llama3", scenario, "364")]: {
          parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
        },
        [payoffCacheKey("mistral", scenario, "364")]: "not an object",
      }),
    )

    expect(getCachedPayoff(storage, "gpt-4o", scenario, "364")).toBeNull()
    expect(getCachedPayoff(storage, "llama3", scenario, "364")).toBeNull()
    expect(getCachedPayoff(storage, "mistral", scenario, "364")).toBeNull()
  })
})
