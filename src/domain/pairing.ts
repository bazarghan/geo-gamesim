import type { Country } from "./country"

/**
 * An unordered pair of selected countries — the unit of LLM querying and of
 * simulation (see CONTEXT.md, "Pairing"). Members are stored in canonical
 * name order so a Pairing is independent of selection order.
 */
export type Pairing = {
  readonly left: Country
  readonly right: Country
}

/** All Pairings among the selected countries. With three selections there are three. */
export function pairingsFor(selected: readonly Country[]): readonly Pairing[] {
  const pairings: Pairing[] = []
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      pairings.push(pairingOf(selected[i], selected[j]))
    }
  }
  return pairings.sort(comparePairings)
}

function comparePairings(a: Pairing, b: Pairing): number {
  return a.left.name === b.left.name
    ? a.right.name.localeCompare(b.right.name)
    : a.left.name.localeCompare(b.left.name)
}

/** Build one Pairing from two countries, in canonical (alphabetical) order. */
export function pairingOf(a: Country, b: Country): Pairing {
  return a.name < b.name ? { left: a, right: b } : { left: b, right: a }
}

/** Stable identifier for a Pairing — canonical ids joined, selection-order-free. */
export function pairingId(pairing: Pairing): string {
  return `${pairing.left.id}-${pairing.right.id}`
}
