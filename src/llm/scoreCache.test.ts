import { describe, expect, it } from "vitest"
import type { Country } from "../domain/country"
import { pairingOf } from "../domain/pairing"
import {
  clearScoreCache,
  getCachedResult,
  saveCachedResult,
  SCORE_CACHE_STORAGE_KEY,
  scoreCacheKey,
} from "./scoreCache"
import { createMemoryStorage } from "../settings/settings"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")

const result = { score: 7, rationale: "Cooperative trade partners." }

describe("scoreCacheKey", () => {
  it("is keyed by model and Pairing", () => {
    const pairing = pairingOf(iran, france)

    expect(scoreCacheKey("gpt-4o", pairing)).not.toBe(scoreCacheKey("llama3", pairing))
  })

  it("is independent of Pairing member order", () => {
    expect(scoreCacheKey("gpt-4o", pairingOf(iran, france))).toBe(
      scoreCacheKey("gpt-4o", pairingOf(france, iran)),
    )
  })
})

describe("cached results", () => {
  it("returns null before anything is cached and the result after saving", () => {
    const storage = createMemoryStorage()
    const pairing = pairingOf(iran, france)

    expect(getCachedResult(storage, "gpt-4o", pairing)).toBeNull()

    saveCachedResult(storage, "gpt-4o", pairing, result)
    expect(getCachedResult(storage, "gpt-4o", pairing)).toEqual(result)
  })

  it("caches per (model, Pairing) — a different model re-queries", () => {
    const storage = createMemoryStorage()
    const pairing = pairingOf(iran, france)

    saveCachedResult(storage, "gpt-4o", pairing, result)

    expect(getCachedResult(storage, "llama3", pairing)).toBeNull()
  })

  it("caches per (model, Pairing) — a different Pairing re-queries", () => {
    const storage = createMemoryStorage()
    const japan = country("392", "Japan")

    saveCachedResult(storage, "gpt-4o", pairingOf(iran, france), result)

    expect(getCachedResult(storage, "gpt-4o", pairingOf(iran, japan))).toBeNull()
  })

  it("is symmetric — either member order reads the same entry", () => {
    const storage = createMemoryStorage()

    saveCachedResult(storage, "gpt-4o", pairingOf(iran, france), result)

    expect(getCachedResult(storage, "gpt-4o", pairingOf(france, iran))).toEqual(result)
  })

  it("persists through the underlying storage", () => {
    const storage = createMemoryStorage()

    saveCachedResult(storage, "gpt-4o", pairingOf(iran, france), result)

    expect(JSON.parse(storage.getItem(SCORE_CACHE_STORAGE_KEY) ?? "{}")).toEqual({
      [scoreCacheKey("gpt-4o", pairingOf(iran, france))]: result,
    })
  })
})

describe("clearScoreCache", () => {
  it("wipes cached results but leaves other storage alone", () => {
    const storage = createMemoryStorage()
    storage.setItem("geo-gamesim.settings", "{}")
    saveCachedResult(storage, "gpt-4o", pairingOf(iran, france), result)

    clearScoreCache(storage)

    expect(getCachedResult(storage, "gpt-4o", pairingOf(iran, france))).toBeNull()
    expect(storage.getItem(SCORE_CACHE_STORAGE_KEY)).toBeNull()
    expect(storage.getItem("geo-gamesim.settings")).toBe("{}")
  })
})

describe("malformed cache blobs", () => {
  it("treats corrupt JSON as empty and keeps saving afterwards", () => {
    const storage = createMemoryStorage()
    storage.setItem(SCORE_CACHE_STORAGE_KEY, "{not json")

    expect(getCachedResult(storage, "gpt-4o", pairingOf(iran, france))).toBeNull()

    saveCachedResult(storage, "gpt-4o", pairingOf(iran, france), result)
    expect(getCachedResult(storage, "gpt-4o", pairingOf(iran, france))).toEqual(result)
  })

  it("ignores invalid entries when loading", () => {
    const storage = createMemoryStorage()
    const pairing = pairingOf(iran, france)
    storage.setItem(
      SCORE_CACHE_STORAGE_KEY,
      JSON.stringify({
        [scoreCacheKey("gpt-4o", pairing)]: { score: 99, rationale: "out of range" },
        [scoreCacheKey("llama3", pairing)]: { score: 3 },
        [scoreCacheKey("mistral", pairing)]: "not an object",
      }),
    )

    expect(getCachedResult(storage, "gpt-4o", pairing)).toBeNull()
    expect(getCachedResult(storage, "llama3", pairing)).toBeNull()
    expect(getCachedResult(storage, "mistral", pairing)).toBeNull()
  })
})
