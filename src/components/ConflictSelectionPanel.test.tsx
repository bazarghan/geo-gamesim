import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import ConflictSelectionPanel from "./ConflictSelectionPanel"
import type { Country } from "../domain/country"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")
const japan = country("392", "Japan")

function panel(selected: readonly Country[]) {
  const html = renderToString(
    <ConflictSelectionPanel
      selected={selected}
      onDeselect={() => {}}
      onRunAnalysis={() => {}}
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
})