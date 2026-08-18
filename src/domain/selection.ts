import type { Country } from "./country"

/** Maximum number of countries a simulation accepts. */
export const SELECTION_LIMIT = 3

/**
 * Toggle a country in the selection. Selecting an already-selected country
 * deselects it; selecting a fourth country while full is ignored.
 */
export function toggleCountry(
  selected: readonly Country[],
  country: Country,
): readonly Country[] {
  const withoutCountry = selected.filter((c) => c.id !== country.id)
  if (withoutCountry.length !== selected.length) return withoutCountry
  if (selected.length >= SELECTION_LIMIT) return selected
  return [...selected, country]
}

export function isSelected(selected: readonly Country[], country: Country): boolean {
  return selected.some((c) => c.id === country.id)
}

/** A simulation can run once 2–3 countries are selected. */
export function canRunSimulation(selected: readonly Country[]): boolean {
  return selected.length >= 2 && selected.length <= SELECTION_LIMIT
}
