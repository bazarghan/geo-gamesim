import { useMemo, useState } from "react"
import SelectionPanel from "./components/SelectionPanel"
import WorldMap from "./components/WorldMap"
import type { Country } from "./domain/country"
import { pairingsFor } from "./domain/pairing"
import { toggleCountry } from "./domain/selection"

export default function App() {
  const [selected, setSelected] = useState<readonly Country[]>([])
  const pairings = useMemo(() => pairingsFor(selected), [selected])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Geo GameSim</h1>
        <p>Pick 2–3 countries and simulate how their relationships play out.</p>
      </header>
      <main className="app-main">
        <WorldMap
          selected={selected}
          onToggleCountry={(country) => setSelected(toggleCountry(selected, country))}
        />
        <SelectionPanel
          selected={selected}
          pairings={pairings}
          onDeselect={(country) => setSelected(toggleCountry(selected, country))}
          onRunSimulation={() => {
            // Simulation engine not built yet — ticket 01 stops at selection.
          }}
        />
      </main>
    </div>
  )
}
