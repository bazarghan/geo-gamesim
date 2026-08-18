import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import SelectionPanel from "./SelectionPanel"
import type { Country } from "../domain/country"
import { pairingsFor } from "../domain/pairing"
import type { PairingStatus } from "./SelectionPanel"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")

type Overrides = Record<string, PairingStatus>

/** Render the panel and strip SSR comment separators for clean matching. */
function panel(statuses: Overrides = {}) {
  const selected = [iran, france]
  const html = renderToString(
    <SelectionPanel
      selected={selected}
      pairings={pairingsFor(selected)}
      statuses={statuses}
      onDeselect={() => {}}
      onRunSimulation={() => {}}
    />,
  )
  return html.replaceAll("<!-- -->", "")
}

describe("SelectionPanel pairing states", () => {
  it("lists Pairings without any status before the first run", () => {
    const html = panel()

    expect(html).toContain("France — Iran")
    expect(html).not.toContain("Asking the model")
    expect(html).not.toContain("pairing-error")
  })

  it("shows a loading state per Pairing", () => {
    expect(panel({ "250-364": { state: "loading" } })).toContain("Asking the model")
  })

  it("shows the score and rationale once fetched, with a cached badge when reused", () => {
    const html = panel({
      "250-364": {
        state: "done",
        result: { score: 7, rationale: "Long-standing economic partners." },
        cached: true,
      },
    })

    expect(html).toContain("7/10")
    expect(html).toContain("Long-standing economic partners.")
    expect(html).toContain("cached")
  })

  it("shows per-Pairing errors as alerts", () => {
    const html = panel({
      "250-364": { state: "error", error: "Missing API key — add one in Settings." },
    })

    expect(html).toContain('role="alert"')
    expect(html).toContain("Missing API key")
  })
})
