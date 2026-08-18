import type { Country } from "./country"

/** Maximum number of countries a conflict scenario accepts. */
export const CONFLICT_LIMIT = 10

/** How many of the early selections are the two belligerents themselves. */
export const BELLIGERENT_COUNT = 2

/** A role in a conflict scenario: one of the two belligerents, or a further party. */
export type PartyRole = "belligerent" | "party"

/** The role of the country at selection index `index`. */
export function roleForIndex(index: number): PartyRole {
  return index < BELLIGERENT_COUNT ? "belligerent" : "party"
}

/** The first two selections — the scenario's belligerents (CONTEXT.md "Party"). */
export function belligerents(selected: readonly Country[]): readonly Country[] {
  return selected.slice(0, BELLIGERENT_COUNT)
}

/** Every selection beyond the two belligerents — parties that may pick a side or stay out. */
export function parties(selected: readonly Country[]): readonly Country[] {
  return selected.slice(BELLIGERENT_COUNT)
}

export function isBelligerent(selected: readonly Country[], country: Country): boolean {
  return belligerents(selected).some((c) => c.id === country.id)
}

/**
 * A conflict analysis can run once the two belligerents are chosen along
 * with at least one further party.
 */
export function canRunConflictAnalysis(selected: readonly Country[]): boolean {
  return selected.length >= BELLIGERENT_COUNT + 1 && selected.length <= CONFLICT_LIMIT
}