import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import App from "./App"
import { LanguageProvider } from "./language"
import { countryName, translate } from "./i18n"
import PairingPlayback from "./components/PairingPlayback"
import { simulate } from "./sim/engine"
import SimulationDialog from "./components/SimulationDialog"

describe("language rendering", () => {
  it("renders an English page and canonical country names", () => {
    const html = renderToString(
      <LanguageProvider initialLanguage="en">
        <App />
      </LanguageProvider>,
    )
    expect(html).toContain('dir="ltr"')
    expect(html).toContain("Run simulation")
    expect(html).toContain("Conflict scenario")
    expect(html).toContain('aria-label="Iran"')
    expect(html).not.toContain("اجرای شبیه‌سازی")
  })
  it("renders translated playback labels and summaries", () => {
    const simulation = simulate(
      { left: { id: "250", name: "France" }, right: { id: "364", name: "Iran" } },
      7,
    )
    const html = renderToString(
      <LanguageProvider initialLanguage="en">
        <PairingPlayback simulation={simulation} />
      </LanguageProvider>,
    )
    expect(html).toContain("Initial score")
    expect(html).toContain('aria-label="Play"')
    expect(html).not.toMatch(/[\u0600-\u06ff]/)
  })
  it("provides a named dialog with a translated close button", () => {
    const html = renderToString(
      <LanguageProvider initialLanguage="en">
        <SimulationDialog title="Simulations" onClose={() => {}}>
          Results
        </SimulationDialog>
      </LanguageProvider>,
    )
    expect(html).toContain("<dialog")
    expect(html).toContain('aria-labelledby="simulation-title"')
    expect(html).toContain('aria-label="Close simulation window"')
  })
  it("handles country labels and parameterized messages in both languages", () => {
    expect(countryName("Iran", "fa")).toBe("ایران")
    expect(countryName("ایران", "en")).toBe("Iran")
    expect(translate("حذف {name}", "en", { name: "Iran" })).toBe("Remove Iran")
    expect(translate("{count} از {limit} کشور", "en", { count: 2, limit: 3 })).toBe(
      "2 of 3 countries",
    )
  })
})
