import { useLanguage } from "../useLanguage"
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
  readonly pending?: boolean
  readonly selected: readonly Country[]
  readonly pairings: readonly Pairing[]
  readonly statuses: Readonly<Record<string, PairingStatus>>
  readonly onDeselect: (country: Country) => void
  readonly onRunSimulation: () => void
}

export default function SelectionPanel({
  pending = false,
  selected,
  pairings,
  statuses,
  onDeselect,
  onRunSimulation,
}: SelectionPanelProps) {
  const { t, countryName } = useLanguage()
  const full = selected.length >= SELECTION_LIMIT

  return (
    <aside className="selection-panel">
      <h2>{t("انتخاب")}</h2>
      <p className="selection-count">
        {t("{count} از {limit} کشور", { count: selected.length, limit: SELECTION_LIMIT })}
      </p>

      {selected.length === 0 && (
        <p className="hint">{t("برای انتخاب، روی کشورها در نقشه کلیک کنید.")}</p>
      )}
      {selected.length === 1 && (
        <p className="hint">{t("برای اجرای شبیه‌سازی حداقل یک کشور دیگر انتخاب کنید.")}</p>
      )}
      {full && (
        <p className="hint">
          {t("انتخاب کامل است — برای جایگزینی روی یک کشور انتخاب‌شده کلیک کنید.")}
        </p>
      )}

      <ul className="chips">
        {selected.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              className="chip"
              onClick={() => onDeselect(country)}
              aria-label={t("حذف {name}", { name: countryName(country.name) })}
            >
              {countryName(country.name)}
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="pairings">
        <h3>{t("جفت‌ها")}</h3>
        {pairings.length === 0 ? (
          <p className="hint">{t("هر جفت نامرتب از کشورهای انتخاب‌شده یک جفت را تشکیل می‌دهد.")}</p>
        ) : (
          <ul className="pairing-list">
            {pairings.map((pairing) => {
              const status = statuses[pairingId(pairing)]
              return (
                <li key={pairingId(pairing)} className="pairing-card">
                  <span className="pairing-name">
                    {countryName(pairing.left.name)} — {countryName(pairing.right.name)}
                  </span>
                  {status?.state === "loading" && (
                    <p className="pairing-status" role="status">
                      {t("در حال پرسش از مدل…")}
                    </p>
                  )}
                  {status?.state === "done" && (
                    <div className="pairing-result">
                      <p className="pairing-score">
                        <span className="score-value">{status.result.score}/10</span>
                        {status.cached && <span className="cached-badge">{t("از حافظه")}</span>}
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
        disabled={pending || !canRunSimulation(selected)}
        onClick={onRunSimulation}
      >
        {t("اجرای شبیه‌سازی")}
      </button>
    </aside>
  )
}
