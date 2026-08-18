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
      <h2>انتخاب</h2>
      <p className="selection-count">
        {selected.length} از {SELECTION_LIMIT} کشور
      </p>

      {selected.length === 0 && (
        <p className="hint">برای انتخاب، روی کشورها در نقشه کلیک کنید.</p>
      )}
      {selected.length === 1 && (
        <p className="hint">برای اجرای شبیه‌سازی حداقل یک کشور دیگر انتخاب کنید.</p>
      )}
      {full && (
        <p className="hint">انتخاب کامل است — برای جایگزینی روی یک کشور انتخاب‌شده کلیک کنید.</p>
      )}

      <ul className="chips">
        {selected.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              className="chip"
              onClick={() => onDeselect(country)}
              aria-label={`حذف ${country.name}`}
            >
              {country.name}
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="pairings">
        <h3>جفت‌ها</h3>
        {pairings.length === 0 ? (
          <p className="hint">هر جفت نامرتب از کشورهای انتخاب‌شده یک جفت را تشکیل می‌دهد.</p>
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
                      در حال پرسش از مدل…
                    </p>
                  )}
                  {status?.state === "done" && (
                    <div className="pairing-result">
                      <p className="pairing-score">
                        <span className="score-value">{status.result.score}/10</span>
                        {status.cached && <span className="cached-badge">از حافظه</span>}
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
        اجرای شبیه‌سازی
      </button>
    </aside>
  )
}
