import type { Country } from "../domain/country"
import {
  BELLIGERENT_COUNT,
  canRunConflictAnalysis,
  CONFLICT_LIMIT,
  roleForIndex,
} from "../domain/conflict"
import type { PayoffParametersResult } from "../llm/payoffCache"

/** Per-Party display state for the most recent conflict analysis. */
export type ConflictPartyStatus =
  | { readonly state: "loading" }
  | { readonly state: "done"; readonly result: PayoffParametersResult; readonly cached: boolean }
  | { readonly state: "error"; readonly error: string }

type ConflictSelectionPanelProps = {
  readonly selected: readonly Country[]
  readonly statuses: Readonly<Record<string, ConflictPartyStatus>>
  readonly onDeselect: (country: Country) => void
  readonly onRunAnalysis: () => void
  readonly onRetryParty: (country: Country) => void
}

export default function ConflictSelectionPanel({
  selected,
  statuses,
  onDeselect,
  onRunAnalysis,
  onRetryParty,
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
          const status = statuses[country.id]
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
              {status?.state === "loading" && (
                <p className="pairing-status" role="status">
                  Asking the model…
                </p>
              )}
              {status?.state === "done" && (
                <div className="pairing-result">
                  <p className="party-parameters">
                    <span>
                      A: {status.result.parameters.affinitySideA} · B:{" "}
                      {status.result.parameters.affinitySideB}
                    </span>
                    <span>
                      Neutral: {status.result.parameters.neutralityValue} · Power:{" "}
                      {status.result.parameters.powerWeight}
                    </span>
                    {status.cached && <span className="cached-badge">cached</span>}
                  </p>
                  <p className="pairing-rationale">{status.result.rationale}</p>
                </div>
              )}
              {status?.state === "error" && (
                <div className="pairing-error" role="alert">
                  <p>{status.error}</p>
                  <button
                    type="button"
                    className="retry-button"
                    onClick={() => onRetryParty(country)}
                  >
                    Retry
                  </button>
                </div>
              )}
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
