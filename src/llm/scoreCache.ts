import type { Pairing } from "../domain/pairing"

/** Where cached Friendliness Scores live between runs. */
export const SCORE_CACHE_STORAGE_KEY = "geo-gamesim.score-cache"

/**
 * A Friendliness Score with its one-sentence rationale, as produced by the
 * LLM for a Pairing (see CONTEXT.md, "Friendliness Score").
 */
export type FriendlinessResult = {
  readonly score: number
  readonly rationale: string
}

/**
 * Cache key for a (model, Pairing). The Pairing's ids are sorted so the key
 * is independent of member order, and the model is part of the key so
 * switching models re-queries.
 */
export function scoreCacheKey(model: string, pairing: Pairing): string {
  const [a, b] = [pairing.left.id, pairing.right.id].sort()
  return `${model}::${a}-${b}`
}

export function getCachedResult(
  storage: Storage,
  model: string,
  pairing: Pairing,
): FriendlinessResult | null {
  const entries = readCache(storage)
  const entry = entries[scoreCacheKey(model, pairing)]
  return entry === undefined ? null : entry
}

export function saveCachedResult(
  storage: Storage,
  model: string,
  pairing: Pairing,
  result: FriendlinessResult,
): void {
  const entries = readCache(storage)
  entries[scoreCacheKey(model, pairing)] = result
  storage.setItem(SCORE_CACHE_STORAGE_KEY, JSON.stringify(entries))
}

/** Wipe every cached score — wired to the settings clear-cache button. */
export function clearScoreCache(storage: Storage): void {
  storage.removeItem(SCORE_CACHE_STORAGE_KEY)
}

/** Parse the stored blob, tolerating corrupt or malformed data. */
function readCache(storage: Storage): Record<string, FriendlinessResult> {
  const raw = storage.getItem(SCORE_CACHE_STORAGE_KEY)
  if (raw === null) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const entries: Record<string, FriendlinessResult> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidResult(value)) entries[key] = value
    }
    return entries
  } catch {
    return {}
  }
}

function isValidResult(value: unknown): value is FriendlinessResult {
  if (typeof value !== "object" || value === null) return false
  const { score, rationale } = value as Partial<FriendlinessResult>
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= 10 &&
    typeof rationale === "string" &&
    rationale.length > 0
  )
}
