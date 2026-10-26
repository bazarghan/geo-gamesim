import { useLanguage } from "../useLanguage"
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
  readonly pending?: boolean
  readonly selected: readonly Country[]
  readonly statuses: Readonly<Record<string, ConflictPartyStatus>>
  readonly onDeselect: (country: Country) => void
  readonly onRunAnalysis: () => void
  readonly onRetryParty: (country: Country) => void
}

export default function ConflictSelectionPanel({
  pending = false,
  selected,
  statuses,
  onDeselect,
  onRunAnalysis,
  onRetryParty,
}: ConflictSelectionPanelProps) {
  const { t, countryName } = useLanguage()
  return (
    <aside className="selection-panel">
      <h2>{t("سناریوی درگیری")}</h2>
      <p className="selection-count">
        {t("{count} از {limit} کشور", { count: selected.length, limit: CONFLICT_LIMIT })}
      </p>

      {selected.length === 0 && (
        <p className="hint">
          {t(
            "دو طرف درگیر را انتخاب کنید، سپس طرف‌هایی که ممکن است جانب یکی را بگیرند اضافه کنید.",
          )}
        </p>
      )}
      {selected.length === 1 && <p className="hint">{t("یک طرف درگیر دیگر انتخاب کنید.")}</p>}
      {selected.length === BELLIGERENT_COUNT && (
        <p className="hint">{t("برای اجرای تحلیل درگیری حداقل یک طرف دیگر اضافه کنید.")}</p>
      )}
      {selected.length >= CONFLICT_LIMIT && (
        <p className="hint">
          {t("انتخاب کامل است — برای جایگزینی روی یک کشور انتخاب‌شده کلیک کنید.")}
        </p>
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
                aria-label={t("حذف {name}", { name: countryName(country.name) })}
              >
                {countryName(country.name)}
                <span className={`role-badge role-${role}`}>
                  {role === "belligerent" ? t("طرف درگیر") : t("طرف")}
                </span>
                <span aria-hidden="true">×</span>
              </button>
              {status?.state === "loading" && (
                <p className="pairing-status" role="status">
                  {t("در حال پرسش از مدل…")}
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
                      {t("بی‌طرفی")}: {status.result.parameters.neutralityValue} · {t("قدرت")}:{" "}
                      {status.result.parameters.powerWeight}
                    </span>
                    {status.cached && <span className="cached-badge">{t("از حافظه")}</span>}
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
                    {t("تلاش مجدد")}
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
        disabled={pending || !canRunConflictAnalysis(selected)}
        onClick={onRunAnalysis}
      >
        {t("اجرای تحلیل درگیری")}
      </button>
    </aside>
  )
}
