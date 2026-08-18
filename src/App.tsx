import { useMemo, useState } from "react"
import SelectionPanel, { type PairingStatus } from "./components/SelectionPanel"
import SettingsModal from "./components/SettingsModal"
import WorldMap from "./components/WorldMap"
import type { Country } from "./domain/country"
import { pairingId, pairingsFor } from "./domain/pairing"
import { toggleCountry } from "./domain/selection"
import { fetchFriendliness } from "./llm/friendliness"
import {
  clearScoreCache,
  getCachedResult,
  saveCachedResult,
} from "./llm/scoreCache"
import { getLocalStorage, loadSettings, saveSettings, type Settings } from "./settings/settings"

export default function App() {
  const [selected, setSelected] = useState<readonly Country[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadSettings(getLocalStorage()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pairingStatuses, setPairingStatuses] = useState<Readonly<Record<string, PairingStatus>>>({})
  const pairings = useMemo(() => pairingsFor(selected), [selected])

  // A new selection starts a fresh run — stale scores from other Pairings
  // must not linger.
  const toggle = (country: Country) => {
    setSelected(toggleCountry(selected, country))
    setPairingStatuses({})
  }

  const runSimulation = () => {
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
        <h1>Geo GameSim</h1>
        <p>Pick 2–3 countries and simulate how their relationships play out.</p>
        <button
          type="button"
          className="settings-button"
          aria-label="Settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z" />
          </svg>
        </button>
      </header>
      <main className="app-main">
        <WorldMap selected={selected} onToggleCountry={toggle} />
        <SelectionPanel
          selected={selected}
          pairings={pairings}
          statuses={pairingStatuses}
          onDeselect={toggle}
          onRunSimulation={runSimulation}
        />
      </main>
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(next) => {
            saveSettings(getLocalStorage(), next)
            setSettings(next)
          }}
          onClose={() => setSettingsOpen(false)}
          onClearCache={() => clearScoreCache(getLocalStorage())}
        />
      )}
    </div>
  )
}
