import type { Country } from "../domain/country"
import { pairingId, type Pairing } from "../domain/pairing"
import type { FriendlinessResult } from "../llm/scoreCache"
import { canRunSimulation, SELECTION_LIMIT } from "../domain/selection"

/** Per-Pairing display state for the most recent run. */
export type PairingStatus =
  | { readonly state: "loading" }
  | { readonly state: "done"; readonly result: FriendlinessResult; readonly cached: boolean }
  | { readonly state: "error"; readonly error: string }

type SelectionPanelProps = {
  readonly selected: readonly Country[]
  readonly pairings: readonly Pairing[]
  readonly statuses: Readonly<Record<string, PairingStatus>>
  readonly onDeselect: (country: Country) => void
  readonly onRunSimulation: () => void
}

export default function SelectionPanel({
  selected,
  pairings,
  statuses,
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
            {pairings.map((pairing) => {
              const status = statuses[pairingId(pairing)]
              return (
                <li key={pairingId(pairing)} className="pairing-card">
                  <span className="pairing-name">
                    {pairing.left.name} — {pairing.right.name}
                  </span>
                  {status?.state === "loading" && (
                    <p className="pairing-status" role="status">
                      Asking the model…
                    </p>
                  )}
                  {status?.state === "done" && (
                    <div className="pairing-result">
                      <p className="pairing-score">
                        <span className="score-value">{status.result.score}/10</span>
                        {status.cached && <span className="cached-badge">cached</span>}
                      </p>
                      <p className="pairing-rationale">{status.result.rationale}</p>
                    </div>
                  )}
                  {status?.state === "error" && (
                    <p className="pairing-error" role="alert">
                      {status.error}
                    </p>
                  )}
                </li>
              )
            })}
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
