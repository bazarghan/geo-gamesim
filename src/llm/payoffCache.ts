import type { PayoffParameters } from "../domain/gameEngine"

/** Where cached Payoff Parameters live between runs. */
export const PAYOFF_CACHE_STORAGE_KEY = "geo-gamesim.payoff-cache"

/**
 * A Party's Payoff Parameters plus the LLM's one-sentence geopolitical
 * rationale, as produced for one Party in a Conflict Scenario
 * (see CONTEXT.md, "Payoff Parameters").
 */
export type PayoffParametersResult = {
  readonly parameters: PayoffParameters
  readonly rationale: string
}

/**
 * A stable key for a Conflict Scenario — the selected country ids sorted
 * and joined, so it is independent of selection order.
 */
export function scenarioKey(selectedIds: readonly string[]): string {
  return [...selectedIds].sort().join("-")
}

/**
 * Cache key for a (model, scenario, party). The scenario and party ids make
 * the key specific to one setup, and the model is part of the key so
 * switching models re-queries.
 */
export function payoffCacheKey(model: string, scenario: string, partyId: string): string {
  return `${model}::${scenario}::${partyId}`
}

export function getCachedPayoff(
  storage: Storage,
  model: string,
  scenario: string,
  partyId: string,
): PayoffParametersResult | null {
  const entries = readCache(storage)
  const entry = entries[payoffCacheKey(model, scenario, partyId)]
  return entry === undefined ? null : entry
}

export function saveCachedPayoff(
  storage: Storage,
  model: string,
  scenario: string,
  partyId: string,
  result: PayoffParametersResult,
): void {
  const entries = readCache(storage)
  entries[payoffCacheKey(model, scenario, partyId)] = result
  storage.setItem(PAYOFF_CACHE_STORAGE_KEY, JSON.stringify(entries))
}

/** Wipe every cached payoff result — wired to the settings clear-cache button. */
export function clearPayoffCache(storage: Storage): void {
  storage.removeItem(PAYOFF_CACHE_STORAGE_KEY)
}

/** Parse the stored blob, tolerating corrupt or malformed data. */
function readCache(storage: Storage): Record<string, PayoffParametersResult> {
  const raw = storage.getItem(PAYOFF_CACHE_STORAGE_KEY)
  if (raw === null) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const entries: Record<string, PayoffParametersResult> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidResult(value)) entries[key] = value
    }
    return entries
  } catch {
    return {}
  }
}

function isValidResult(value: unknown): value is PayoffParametersResult {
  if (typeof value !== "object" || value === null) return false
  const { parameters, rationale } = value as Partial<PayoffParametersResult>
  return (
    typeof parameters === "object" &&
    parameters !== null &&
    isInRange(parameters.affinitySideA) &&
    isInRange(parameters.affinitySideB) &&
    isInRange(parameters.neutralityValue) &&
    isInRange(parameters.powerWeight) &&
    typeof rationale === "string" &&
    rationale.length > 0
  )
}

function isInRange(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10
}
