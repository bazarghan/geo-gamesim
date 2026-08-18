import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import ConflictSelectionPanel from "./ConflictSelectionPanel"
import type { Country } from "../domain/country"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "ایران")
const france = country("250", "فرانسه")
const japan = country("392", "ژاپن")

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

    expect(html).toContain("0 از 10 کشور")
    expect(html).toContain("اجرای تحلیل درگیری")
    expect(html).not.toContain("pairing-")
  })

  it("stays disabled until a party beyond the two belligerents is picked", () => {
    expect(panel([iran, france])).toContain("برای اجرای تحلیل درگیری حداقل یک طرف دیگر اضافه کنید")
    expect(panel([iran, france]).match(/disabled/g)).not.toBeNull()
  })

  it("enables the run button with two belligerents and one party", () => {
    expect(panel([iran, france, japan]).match(/disabled/g)).toBeNull()
  })

  it("lists selection-order roles: two belligerents first, then parties", () => {
    const html = panel([iran, france, japan])

    expect(html.match(/طرف درگیر/g)).toHaveLength(2)
    expect(html.match(/<span class="role-badge role-party">طرف<\/span>/g)).toHaveLength(1)
    expect(html.indexOf("ایران")).toBeLessThan(html.indexOf("طرف درگیر"))
    expect(html.indexOf("ژاپن")).toBeLessThan(html.indexOf("role-party"))
  })

  it("keeps labels for deselecting every selected country", () => {
    const html = panel([iran, france, japan])

    expect(html).toContain('aria-label="حذف ایران"')
    expect(html).toContain('aria-label="حذف فرانسه"')
    expect(html).toContain('aria-label="حذف ژاپن"')
  })

  it("shows a loading status for a party being queried", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: { state: "loading" },
    })

    expect(html).toContain("در حال پرسش از مدل…")
  })

  it("shows computed parameters and rationale once a party is done", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: {
        state: "done",
        cached: false,
        result: {
          parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
          rationale: "کاملاً هم‌راستا با بلوک منطقه‌ای.",
        },
      },
    })

    expect(html).toContain("A: 8")
    expect(html).toContain("B: 2")
    expect(html).toContain("قدرت: 7")
    expect(html).toContain("کاملاً هم‌راستا با بلوک منطقه‌ای.")
  })

  it("shows a cached badge when a done party came from cache", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: {
        state: "done",
        cached: true,
        result: {
          parameters: { affinitySideA: 8, affinitySideB: 2, neutralityValue: 4, powerWeight: 7 },
          rationale: "کاملاً هم‌راستا.",
        },
      },
    })

    expect(html).toContain("از حافظه")
  })

  it("shows an error with a retry action for a failed party", () => {
    const html = panel([iran, france, japan], {
      [iran.id]: { state: "error", error: "خطای API 401: bad key" },
    })

    expect(html).toContain("خطای API 401: bad key")
    expect(html).toContain("تلاش مجدد")
  })
})