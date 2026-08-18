import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import App from "./App"

describe("App", () => {
  it("renders the map, every selectable country, and a disabled Run Simulation button", () => {
    const html = renderToString(<App />)

    expect(html).toContain("Geo GameSim")
    expect(html).toContain("World map")
    expect(html).toContain("Run Simulation")
    expect(html).toContain("disabled")

    // One path per Natural Earth 110m country minus Antarctica
    expect(html.match(/class="country"/g)).toHaveLength(176)

    // No country is selected or labeled on first render
    expect(html).not.toContain("country-label")
    expect(html).not.toContain("country-tooltip")
  })

  it("renders the settings gear but keeps the settings modal closed", () => {
    const html = renderToString(<App />)

    expect(html).toContain('aria-label="Settings"')
    expect(html).not.toContain("Clear cached results")
    expect(html).not.toContain("Base URL")
  })

  it("renders a header toggle that defaults to the bilateral sim", () => {
    const html = renderToString(<App />)

    expect(html).toContain("Bilateral Sim")
    expect(html).toContain("Conflict Scenario")
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).not.toContain("Run Conflict Analysis")
  })
})
