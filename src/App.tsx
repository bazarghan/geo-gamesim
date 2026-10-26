import { useMemo, useRef, useState } from "react"
import SelectionPanel, { type PairingStatus } from "./components/SelectionPanel"
import SettingsModal from "./components/SettingsModal"
import WorldMap from "./components/WorldMap"
import ConflictSelectionPanel, {
  type ConflictPartyStatus,
} from "./components/ConflictSelectionPanel"
import SimulationDialog from "./components/SimulationDialog"
import type { Country } from "./domain/country"
import { BELLIGERENT_COUNT, belligerents, CONFLICT_LIMIT } from "./domain/conflict"
import { BILATERAL_MODE, CONFLICT_MODE, type SimulationMode } from "./domain/mode"
import { pairingId, pairingsFor, type Pairing } from "./domain/pairing"
import { SELECTION_LIMIT, toggleCountry } from "./domain/selection"
import { fetchFriendliness } from "./llm/friendliness"
import { clearScoreCache, getCachedResult, saveCachedResult } from "./llm/scoreCache"
import { fetchPayoffParameters } from "./llm/payoffParameters"
import {
  clearPayoffCache,
  getCachedPayoff,
  saveCachedPayoff,
  type PayoffParametersResult,
} from "./llm/payoffCache"
import { getLocalStorage, loadSettings, saveSettings, type Settings } from "./settings/settings"
import { overallVerdictFor } from "./sim/aggregate"
import { simulate } from "./sim/engine"
import PairingPlayback from "./components/PairingPlayback"
import OverallVerdictTile from "./components/OverallVerdictTile"
import TriangleDiagram from "./components/TriangleDiagram"
import AnalysisResultsScreen from "./components/AnalysisResultsScreen"
import { useLanguage } from "./useLanguage"
import type { Language } from "./i18n"

export default function App() {
  const { language, setLanguage, t, countryName } = useLanguage()
  const [mode, setMode] = useState<SimulationMode>(BILATERAL_MODE)
  const [selected, setSelected] = useState<readonly Country[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadSettings(getLocalStorage()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [pairingStatuses, setPairingStatuses] = useState<Readonly<Record<string, PairingStatus>>>(
    {},
  )
  const [conflictStatuses, setConflictStatuses] = useState<
    Readonly<Record<string, ConflictPartyStatus>>
  >({})
  const generation = useRef(0)
  const isBilateral = mode === BILATERAL_MODE
  const pairings = useMemo(
    () => (isBilateral ? pairingsFor(selected) : []),
    [isBilateral, selected],
  )
  const belligerentIds = useMemo(
    () => (isBilateral ? undefined : new Set(belligerents(selected).map((c) => c.id))),
    [isBilateral, selected],
  )
  const simulations = useMemo(
    () =>
      pairings.flatMap((pairing) => {
        const status = pairingStatuses[pairingId(pairing)]
        return status?.state === "done" ? [simulate(pairing, status.result.score)] : []
      }),
    [pairings, pairingStatuses],
  )
  const fullRun = selected.length === SELECTION_LIMIT && simulations.length === pairings.length
  const conflictResults = useMemo(() => {
    const results: Record<string, PayoffParametersResult> = {}
    for (const country of selected) {
      const status = conflictStatuses[country.id]
      if (status?.state === "done") results[country.id] = status.result
    }
    return results
  }, [selected, conflictStatuses])
  const conflictAnalysisDone =
    !isBilateral &&
    selected.length >= 3 &&
    selected.every((c) => conflictStatuses[c.id]?.state === "done")
  // Provider and language are part of cache identity so rationales cannot leak across them.
  const cacheModel = JSON.stringify([settings.baseUrl, settings.model, language])
  // The first two countries have distinct roles; reversing them changes the scenario.
  const scenario = JSON.stringify([
    selected[0]?.id,
    selected[1]?.id,
    selected
      .slice(BELLIGERENT_COUNT)
      .map((c) => c.id)
      .sort(),
  ])

  const resetResults = () => {
    generation.current += 1
    setPairingStatuses({})
    setConflictStatuses({})
    setResultsOpen(false)
  }
  const changeMode = (next: SimulationMode) => {
    if (next === mode) return
    resetResults()
    setSelected([])
    setMode(next)
  }
  const changeLanguage = (next: Language) => {
    if (next === language) return
    resetResults()
    setLanguage(next)
  }
  const toggle = (country: Country) => {
    const next = toggleCountry(selected, country, isBilateral ? SELECTION_LIMIT : CONFLICT_LIMIT)
    if (next === selected) return
    resetResults()
    setSelected(next)
  }

  const requestPairing = async (pairing: Pairing) => {
    const version = generation.current
    const storage = getLocalStorage()
    const key = pairingId(pairing)
    const cached = getCachedResult(storage, cacheModel, pairing)
    if (cached) {
      setPairingStatuses((prev) => ({
        ...prev,
        [key]: { state: "done", result: cached, cached: true },
      }))
      return
    }
    setPairingStatuses((prev) => ({ ...prev, [key]: { state: "loading" } }))
    const outcome = await fetchFriendliness(settings, pairing, fetch, language)
    if (version !== generation.current) return
    if (outcome.ok) {
      saveCachedResult(storage, cacheModel, pairing, outcome.result)
      setPairingStatuses((prev) => ({
        ...prev,
        [key]: { state: "done", result: outcome.result, cached: false },
      }))
    } else
      setPairingStatuses((prev) => ({ ...prev, [key]: { state: "error", error: outcome.error } }))
  }

  const requestParty = async (country: Country) => {
    const version = generation.current
    const storage = getLocalStorage()
    const cached = getCachedPayoff(storage, cacheModel, scenario, country.id)
    if (cached) {
      setConflictStatuses((prev) => ({
        ...prev,
        [country.id]: { state: "done", result: cached, cached: true },
      }))
      return
    }
    setConflictStatuses((prev) => ({ ...prev, [country.id]: { state: "loading" } }))
    const context = `Side A: ${selected[0]?.name}. Side B: ${selected[1]?.name}. Other parties: ${selected
      .slice(BELLIGERENT_COUNT)
      .map((c) => c.name)
      .join(", ")}.`
    const outcome = await fetchPayoffParameters(settings, country.name, context, fetch, language)
    if (version !== generation.current) return
    if (outcome.ok) {
      saveCachedPayoff(storage, cacheModel, scenario, country.id, outcome.result)
      setConflictStatuses((prev) => ({
        ...prev,
        [country.id]: { state: "done", result: outcome.result, cached: false },
      }))
    } else
      setConflictStatuses((prev) => ({
        ...prev,
        [country.id]: { state: "error", error: outcome.error },
      }))
  }

  const statuses = isBilateral ? Object.values(pairingStatuses) : Object.values(conflictStatuses)
  const pending = statuses.some((status) => status.state === "loading")
  const run = () => {
    setResultsOpen(true)
    if (pending) return
    if (isBilateral)
      pairings.forEach((pairing) => {
        void requestPairing(pairing)
      })
    else
      selected.forEach((country) => {
        void requestParty(country)
      })
  }
  const progress = isBilateral
    ? pairings.map((pairing) => ({
        id: pairingId(pairing),
        name: `${countryName(pairing.left.name)} — ${countryName(pairing.right.name)}`,
        status: pairingStatuses[pairingId(pairing)],
        retry: () => {
          void requestPairing(pairing)
        },
      }))
    : selected.map((country) => ({
        id: country.id,
        name: countryName(country.name),
        status: conflictStatuses[country.id],
        retry: () => {
          void requestParty(country)
        },
      }))
  const hasErrors = statuses.some((status) => status.state === "error")

  return (
    <div className="app" dir={language === "fa" ? "rtl" : "ltr"}>
      <header className="app-header">
        <h1>{t("شبیه‌ساز ژئوپلیتیک")}</h1>
        <div className="mode-toggle" role="group" aria-label={t("حالت شبیه‌سازی")}>
          <button
            type="button"
            className="mode-button"
            aria-pressed={isBilateral}
            onClick={() => changeMode(BILATERAL_MODE)}
          >
            {t("شبیه‌سازی دوجانبه")}
          </button>
          <button
            type="button"
            className="mode-button"
            aria-pressed={!isBilateral}
            onClick={() => changeMode(CONFLICT_MODE)}
          >
            {t("سناریوی درگیری")}
          </button>
        </div>
        <p>
          {t(
            isBilateral
              ? "۲ تا ۳ کشور انتخاب کنید تا روند روابطشان شبیه‌سازی شود."
              : "دو طرف درگیر را انتخاب کرده و طرف‌های دیگر را برای تحلیل یک سناریوی درگیری اضافه کنید.",
          )}
        </p>
        <div className="header-actions">
          <select
            className="language-select"
            aria-label={t("زبان")}
            value={language}
            onChange={(event) => changeLanguage(event.target.value as Language)}
          >
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
          <button
            type="button"
            className="settings-button"
            aria-label={t("تنظیمات")}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z" />
            </svg>
          </button>
        </div>
      </header>
      <main className="app-main">
        <div className="stage">
          <WorldMap selected={selected} onToggleCountry={toggle} belligerentIds={belligerentIds} />
        </div>
        <div className="sidebar">
          {isBilateral ? (
            <SelectionPanel
              selected={selected}
              pairings={pairings}
              statuses={pairingStatuses}
              onDeselect={toggle}
              onRunSimulation={run}
              pending={pending}
            />
          ) : (
            <ConflictSelectionPanel
              selected={selected}
              statuses={conflictStatuses}
              onDeselect={toggle}
              onRunAnalysis={run}
              onRetryParty={(country) => {
                void requestParty(country)
              }}
              pending={pending}
            />
          )}
          {statuses.length > 0 && (
            <button
              type="button"
              className="ghost-button view-results"
              onClick={() => setResultsOpen(true)}
            >
              {t("مشاهده نتایج")}
            </button>
          )}
        </div>
      </main>
      {resultsOpen && (
        <SimulationDialog
          title={t(isBilateral ? "شبیه‌سازی‌ها" : "نتایج تحلیل درگیری")}
          onClose={() => setResultsOpen(false)}
        >
          {(pending || hasErrors) && (
            <div className="run-progress" aria-busy={pending}>
              <h3>
                {t(
                  pending
                    ? "در حال آماده‌سازی شبیه‌سازی"
                    : hasErrors
                      ? "بعضی درخواست‌ها ناموفق بود"
                      : "نتایج آماده است",
                )}
              </h3>
              <p className="hint">
                {t(
                  "نتایج در همین پنجره نمایش داده می‌شود. می‌توانید پنجره را ببندید و بعداً دوباره باز کنید.",
                )}
              </p>
              <ul className="progress-list">
                {progress.map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    {item.status?.state === "done" ? (
                      <span className="progress-ready">{t("آماده")}</span>
                    ) : item.status?.state === "error" ? (
                      <div className="pairing-error" role="alert">
                        <p>{item.status.error}</p>
                        <button className="retry-button" onClick={item.retry}>
                          {t("تلاش مجدد")}
                        </button>
                      </div>
                    ) : (
                      <span role="status">{t("در حال پرسش از مدل…")}</span>
                    )}
                  </li>
                ))}
              </ul>
              {hasErrors && (
                <button
                  className="ghost-button"
                  onClick={() => {
                    setResultsOpen(false)
                    setSettingsOpen(true)
                  }}
                >
                  {t("باز کردن تنظیمات")}
                </button>
              )}
            </div>
          )}
          {isBilateral && (
            <section className="simulation-stage" aria-label={t("شبیه‌سازی‌ها")}>
              {fullRun && (
                <div className="results-summary">
                  <TriangleDiagram countries={selected} simulations={simulations} />
                  <OverallVerdictTile verdict={overallVerdictFor(simulations)} />
                </div>
              )}
              <div className="simulation-panels">
                {simulations.map((simulation) => {
                  const status = pairingStatuses[pairingId(simulation.pairing)]
                  return (
                    <PairingPlayback
                      key={pairingId(simulation.pairing)}
                      simulation={simulation}
                      rationale={status?.state === "done" ? status.result.rationale : undefined}
                    />
                  )
                })}
              </div>
            </section>
          )}
          {conflictAnalysisDone && (
            <AnalysisResultsScreen countries={selected} results={conflictResults} />
          )}
        </SimulationDialog>
      )}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            resetResults()
            setSettings(next)
            saveSettings(getLocalStorage(), next)
          }}
          onClearCache={() => {
            const storage = getLocalStorage()
            clearScoreCache(storage)
            clearPayoffCache(storage)
            resetResults()
          }}
        />
      )}
    </div>
  )
}
