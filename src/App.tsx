import { useMemo, useState } from "react"
import SelectionPanel, { type PairingStatus } from "./components/SelectionPanel"
import SettingsModal from "./components/SettingsModal"
import WorldMap from "./components/WorldMap"
import ConflictSelectionPanel, {
  type ConflictPartyStatus,
} from "./components/ConflictSelectionPanel"
import type { Country } from "./domain/country"
import { BELLIGERENT_COUNT, belligerents, CONFLICT_LIMIT } from "./domain/conflict"
import { BILATERAL_MODE, CONFLICT_MODE, type SimulationMode } from "./domain/mode"
import { pairingId, pairingsFor } from "./domain/pairing"
import { SELECTION_LIMIT, toggleCountry } from "./domain/selection"
import { fetchFriendliness } from "./llm/friendliness"
import {
  clearScoreCache,
  getCachedResult,
  saveCachedResult,
} from "./llm/scoreCache"
import { fetchPayoffParameters } from "./llm/payoffParameters"
import {
  clearPayoffCache,
  getCachedPayoff,
  saveCachedPayoff,
  scenarioKey,
  type PayoffParametersResult,
} from "./llm/payoffCache"
import { getLocalStorage, loadSettings, saveSettings, type Settings } from "./settings/settings"
import { overallVerdictFor } from "./sim/aggregate"
import { simulate } from "./sim/engine"
import PairingPlayback from "./components/PairingPlayback"
import OverallVerdictTile from "./components/OverallVerdictTile"
import TriangleDiagram from "./components/TriangleDiagram"
import AnalysisResultsScreen from "./components/AnalysisResultsScreen"

export default function App() {
  const [mode, setMode] = useState<SimulationMode>(BILATERAL_MODE)
  const [selected, setSelected] = useState<readonly Country[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadSettings(getLocalStorage()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pairingStatuses, setPairingStatuses] = useState<Readonly<Record<string, PairingStatus>>>({})
  const [conflictStatuses, setConflictStatuses] = useState<
    Readonly<Record<string, ConflictPartyStatus>>
  >({})
  const [simulationMaximized, setSimulationMaximized] = useState(false)

  const isBilateral = mode === BILATERAL_MODE
  const pairings = useMemo(() => (isBilateral ? pairingsFor(selected) : []), [isBilateral, selected])
  const belligerentIds = useMemo(
    () => (isBilateral ? undefined : new Set(belligerents(selected).map((c) => c.id))),
    [isBilateral, selected],
  )

  // Every scored Pairing gets its 50-Round story computed instantly, in full.
  const simulations = useMemo(
    () =>
      pairings.flatMap((pairing) => {
        const status = pairingStatuses[pairingId(pairing)]
        return status?.state === "done" ? [simulate(pairing, status.result.score)] : []
      }),
    [pairings, pairingStatuses],
  )

  // The three-country results screen appears once every Pairing of a full
  // selection has been scored.
  const fullRun =
    selected.length === SELECTION_LIMIT && simulations.length === pairings.length

  // Ticket 09: the conflict results screen appears once every party in the
  // scenario has its Payoff Parameters, then the engine runs on them.
  const conflictResults = useMemo(() => {
    const results: Record<string, PayoffParametersResult> = {}
    for (const country of selected) {
      const status = conflictStatuses[country.id]
      if (status?.state === "done") results[country.id] = status.result
    }
    return results
  }, [selected, conflictStatuses])
  const conflictAnalysisDone =
    !isBilateral && selected.length > 0 && selected.every((c) => conflictStatuses[c.id]?.state === "done")

  // A new selection starts a fresh run — stale scores from other Pairings
  // must not linger. Each mode caps its selection differently.
  const toggle = (country: Country) => {
    setSelected(toggleCountry(selected, country, isBilateral ? SELECTION_LIMIT : CONFLICT_LIMIT))
    setPairingStatuses({})
    setConflictStatuses({})
    setSimulationMaximized(false)
  }

  // Ticket 08: one payoff-parameter LLM call per party in the scenario,
  // cached per (model, scenario, party) and retried per party on demand.
  const runConflictAnalysis = () => {
    setSimulationMaximized(true)
    const storage = getLocalStorage()
    const scenario = scenarioKey(selected.map((c) => c.id))
    const context = `دو طرف درگیر، ${belligerents(selected)
      .map((c) => c.name)
      .join(" و ")} هستند. سایر طرف‌های درگیر: ${selected
      .slice(BELLIGERENT_COUNT)
      .map((c) => c.name)
      .join("، ") || "هیچ"}.`

    for (const country of selected) {
      const cached = getCachedPayoff(storage, settings.model, scenario, country.id)
      if (cached !== null) {
        setConflictStatuses((prev) => ({
          ...prev,
          [country.id]: { state: "done", result: cached, cached: true },
        }))
        continue
      }
      setConflictStatuses((prev) => ({ ...prev, [country.id]: { state: "loading" } }))
      void fetchPayoffParameters(settings, country.name, context).then((outcome) => {
        setConflictStatuses((prev) => {
          if (!outcome.ok) {
            return { ...prev, [country.id]: { state: "error", error: outcome.error } }
          }
          saveCachedPayoff(storage, settings.model, scenario, country.id, outcome.result)
          return { ...prev, [country.id]: { state: "done", result: outcome.result, cached: false } }
        })
      })
    }
  }

  // Re-run a single failed party without touching any other party's status.
  const retryParty = (country: Country) => {
    const storage = getLocalStorage()
    const scenario = scenarioKey(selected.map((c) => c.id))
    const context = `دو طرف درگیر، ${belligerents(selected)
      .map((c) => c.name)
      .join(" و ")} هستند. سایر طرف‌های درگیر: ${selected
      .slice(BELLIGERENT_COUNT)
      .map((c) => c.name)
      .join("، ") || "هیچ"}.`

    setConflictStatuses((prev) => ({ ...prev, [country.id]: { state: "loading" } }))
    void fetchPayoffParameters(settings, country.name, context).then((outcome) => {
      setConflictStatuses((prev) => {
        if (!outcome.ok) {
          return { ...prev, [country.id]: { state: "error", error: outcome.error } }
        }
        saveCachedPayoff(storage, settings.model, scenario, country.id, outcome.result)
        return { ...prev, [country.id]: { state: "done", result: outcome.result, cached: false } }
      })
    })
  }

  const runSimulation = () => {
    setSimulationMaximized(true)
    const storage = getLocalStorage()
    for (const pairing of pairings) {
      const key = pairingId(pairing)

      const cached = getCachedResult(storage, settings.model, pairing)
      if (cached !== null) {
        setPairingStatuses((prev) => ({ ...prev, [key]: { state: "done", result: cached, cached: true } }))
        continue
      }

      setPairingStatuses((prev) => ({ ...prev, [key]: { state: "loading" } }))
      void fetchFriendliness(settings, pairing).then((outcome) => {
        setPairingStatuses((prev) => {
          if (!outcome.ok) return { ...prev, [key]: { state: "error", error: outcome.error } }
          saveCachedResult(storage, settings.model, pairing, outcome.result)
          return { ...prev, [key]: { state: "done", result: outcome.result, cached: false } }
        })
      })
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>شبیه‌ساز ژئوپلیتیک</h1>
        <div
          className="mode-toggle"
          role="group"
          aria-label="حالت شبیه‌سازی"
        >
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === BILATERAL_MODE}
            onClick={() => {
              setMode(BILATERAL_MODE)
              setSimulationMaximized(false)
            }}
          >
            شبیه‌سازی دوجانبه
          </button>
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === CONFLICT_MODE}
            onClick={() => {
              setMode(CONFLICT_MODE)
              setSimulationMaximized(false)
            }}
          >
            سناریوی درگیری
          </button>
        </div>
        <p>
          {isBilateral
            ? "۲ تا ۳ کشور انتخاب کنید تا روند روابطشان شبیه‌سازی شود."
            : "دو طرف درگیر را انتخاب کرده و طرف‌های دیگر را برای تحلیل یک سناریوی درگیری اضافه کنید."}
        </p>
        <button
          type="button"
          className="settings-button"
          aria-label="تنظیمات"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z" />
          </svg>
        </button>
      </header>
      <main className="app-main">
        <div className={simulationMaximized ? "stage stage-maximized" : "stage"}>
          <WorldMap
            selected={selected}
            onToggleCountry={toggle}
            belligerentIds={belligerentIds}
          />
          {isBilateral && simulations.length > 0 && (
            <section className="simulation-stage" aria-label="شبیه‌سازی‌ها">
              <div className="simulation-header">
                <h2>شبیه‌سازی‌ها</h2>
                <button
                  type="button"
                  className="expand-button"
                  aria-pressed={simulationMaximized}
                  onClick={() => setSimulationMaximized((maximized) => !maximized)}
                >
                  {simulationMaximized ? "کوچک کردن" : "بزرگ کردن"}
                </button>
              </div>
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
          {!isBilateral && conflictAnalysisDone && (
            <AnalysisResultsScreen
              countries={selected}
              results={conflictResults}
              maximized={simulationMaximized}
              onToggleMaximize={() => setSimulationMaximized((maximized) => !maximized)}
            />
          )}
        </div>
        {isBilateral ? (
          <SelectionPanel
            selected={selected}
            pairings={pairings}
            statuses={pairingStatuses}
            onDeselect={toggle}
            onRunSimulation={runSimulation}
          />
        ) : (
          <ConflictSelectionPanel
            selected={selected}
            statuses={conflictStatuses}
            onDeselect={toggle}
            onRunAnalysis={runConflictAnalysis}
            onRetryParty={retryParty}
          />
        )}
      </main>
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(next) => {
            saveSettings(getLocalStorage(), next)
            setSettings(next)
          }}
          onClose={() => setSettingsOpen(false)}
          onClearCache={() => {
            clearScoreCache(getLocalStorage())
            clearPayoffCache(getLocalStorage())
          }}
        />
      )}
    </div>
  )
}
