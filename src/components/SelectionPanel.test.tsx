import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import SelectionPanel from "./SelectionPanel"
import type { Country } from "../domain/country"
import { pairingId, pairingOf, pairingsFor } from "../domain/pairing"
import type { PairingStatus } from "./SelectionPanel"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "ایران")
const france = country("250", "فرانسه")
const key = pairingId(pairingOf(iran, france))

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

    expect(html).toContain("ایران — فرانسه")
    expect(html).not.toContain("در حال پرسش از مدل")
    expect(html).not.toContain("pairing-error")
  })

  it("shows a loading state per Pairing", () => {
    expect(panel({ [key]: { state: "loading" } })).toContain("در حال پرسش از مدل")
  })

  it("shows the score and rationale once fetched, with a cached badge when reused", () => {
    const html = panel({
      [key]: {
        state: "done",
        result: { score: 7, rationale: "شرکای اقتصادی دیرینه." },
        cached: true,
      },
    })

    expect(html).toContain("7/10")
    expect(html).toContain("شرکای اقتصادی دیرینه.")
    expect(html).toContain("از حافظه")
  })

  it("shows per-Pairing errors as alerts", () => {
    const html = panel({
      [key]: { state: "error", error: "کلید API وجود ندارد — در تنظیمات یک کلید اضافه کنید." },
    })

    expect(html).toContain('role="alert"')
    expect(html).toContain("کلید API وجود ندارد")
  })
})
