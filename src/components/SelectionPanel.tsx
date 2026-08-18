import type { Country } from "../domain/country"
import type { Pairing } from "../domain/pairing"
import { canRunSimulation, SELECTION_LIMIT } from "../domain/selection"

type SelectionPanelProps = {
  readonly selected: readonly Country[]
  readonly pairings: readonly Pairing[]
  readonly onDeselect: (country: Country) => void
  readonly onRunSimulation: () => void
}

export default function SelectionPanel({
  selected,
  pairings,
  onDeselect,
  onRunSimulation,
}: SelectionPanelProps) {
  const full = selected.length >= SELECTION_LIMIT

  return (
    <aside className="selection-panel">
      <h2>Selection</h2>
      <p className="selection-count">
        {selected.length} of {SELECTION_LIMIT} countries
      </p>

      {selected.length === 0 && (
        <p className="hint">Click countries on the map to select them.</p>
      )}
      {selected.length === 1 && (
        <p className="hint">Pick at least one more country to run a simulation.</p>
      )}
      {full && (
        <p className="hint">Selection is full — click a selected country to swap it out.</p>
      )}

      <ul className="chips">
        {selected.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              className="chip"
              onClick={() => onDeselect(country)}
              aria-label={`Deselect ${country.name}`}
            >
              {country.name}
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="pairings">
        <h3>Pairings</h3>
        {pairings.length === 0 ? (
          <p className="hint">Every unordered pair of selected countries forms a Pairing.</p>
        ) : (
          <ul className="pairing-list">
            {pairings.map((pairing) => (
              <li key={`${pairing.left.id}-${pairing.right.id}`}>
                {pairing.left.name} — {pairing.right.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="run-button"
        disabled={!canRunSimulation(selected)}
        onClick={onRunSimulation}
      >
        Run Simulation
      </button>
    </aside>
  )
}
