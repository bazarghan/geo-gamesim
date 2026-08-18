import type { Country } from "../domain/country"
import {
  BELLIGERENT_COUNT,
  canRunConflictAnalysis,
  CONFLICT_LIMIT,
  roleForIndex,
} from "../domain/conflict"

type ConflictSelectionPanelProps = {
  readonly selected: readonly Country[]
  readonly onDeselect: (country: Country) => void
  readonly onRunAnalysis: () => void
}

export default function ConflictSelectionPanel({
  selected,
  onDeselect,
  onRunAnalysis,
}: ConflictSelectionPanelProps) {
  return (
    <aside className="selection-panel">
      <h2>Conflict Scenario</h2>
      <p className="selection-count">
        {selected.length} of {CONFLICT_LIMIT} countries
      </p>

      {selected.length === 0 && (
        <p className="hint">Pick two belligerents, then add parties that may pick a side.</p>
      )}
      {selected.length === 1 && <p className="hint">Pick one more belligerent.</p>}
      {selected.length === BELLIGERENT_COUNT && (
        <p className="hint">Pick at least one more party to run a conflict analysis.</p>
      )}
      {selected.length >= CONFLICT_LIMIT && (
        <p className="hint">Selection is full — click a selected country to swap it out.</p>
      )}

      <ul className="chips">
        {selected.map((country, index) => {
          const role = roleForIndex(index)
          return (
            <li key={country.id}>
              <button
                type="button"
                className="chip"
                onClick={() => onDeselect(country)}
                aria-label={`Deselect ${country.name}`}
              >
                {country.name}
                <span className={`role-badge role-${role}`}>
                  {role === "belligerent" ? "Belligerent" : "Party"}
                </span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className="run-button"
        disabled={!canRunConflictAnalysis(selected)}
        onClick={onRunAnalysis}
      >
        Run Conflict Analysis
      </button>
    </aside>
  )
}