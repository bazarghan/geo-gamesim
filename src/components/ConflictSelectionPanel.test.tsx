import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import ConflictSelectionPanel from "./ConflictSelectionPanel"
import type { Country } from "../domain/country"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")
const japan = country("392", "Japan")

function panel(selected: readonly Country[], statuses = {}) {
  const html = renderToString(
    <ConflictSelectionPanel
      selected={selected}
      statuses={statuses}
      onDeselect={() => {}}
      onRunAnalysis={() => {}}
      onRetryParty={() => {}}
    />,
  )
  return html.replaceAll("<!-- -->", "")
}

describe("ConflictSelectionPanel", () => {
  it("shows the conflict cap and a disabled run button before any selection", () => {
    const html = panel([])

    expect(html).toContain("0 of 10 countries")
    expect(html).toContain("Run Conflict Analysis")
    expect(html).not.toContain("pairing-")
  })

  it("stays disabled until a party beyond the two belligerents is picked", () => {
    expect(panel([iran, france])).toContain("Pick at least one more party")
    expect(panel([iran, france]).match(/disabled/g)).not.toBeNull()
  })

  it("enables the run button with two belligerents and one party", () => {
    expect(panel([iran, france, japan]).match(/disabled/g)).toBeNull()
  })

  it("lists selection-order roles: two belligerents first, then parties", () => {
    const html = panel([iran, france, japan])

    expect(html.match(/Belligerent/g)).toHaveLength(2)
    expect(html.match(/Party/g)).toHaveLength(1)
    expect(html.indexOf("Iran")).toBeLessThan(html.indexOf("Belligerent"))
    expect(html.indexOf("Japan")).toBeLessThan(html.indexOf("Party"))
  })

  it("keeps labels for deselecting every selected country", () => {
    const html = panel([iran, france, japan])

    expect(html).toContain('aria-label="Deselect Iran"')
    expect(html).toContain('aria-label="Deselect France"')
    expect(html).toContain('aria-label="Deselect Japan"')
  })

  it("shows a loading status for a party being queried", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: { state: "loading" },
    })

    expect(html).toContain("Asking the model…")
  })

  it("shows computed parameters and rationale once a party is done", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: {
        state: "done",
        cached: false,
        result: {
          parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
          rationale: "Firmly aligned with the regional bloc.",
        },
      },
    })

    expect(html).toContain("A: 8")
    expect(html).toContain("B: 2")
    expect(html).toContain("Power: 7")
    expect(html).toContain("Firmly aligned with the regional bloc.")
  })

  it("shows a cached badge when a done party came from cache", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: {
        state: "done",
        cached: true,
        result: {
          parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
          rationale: "Firmly aligned.",
        },
      },
    })

    expect(html).toContain("cached")
  })

  it("shows an error with a retry action for a failed party", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: { state: "error", error: "API error 401: bad key" },
    })

    expect(html).toContain("API error 401: bad key")
    expect(html).toContain("Retry")
  })
})