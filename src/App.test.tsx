import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import App from "./App"

describe("App", () => {
  it("renders the map, every selectable country, and a disabled Run Simulation button", () => {
    const html = renderToString(<App />)

    expect(html).toContain("شبیه‌ساز ژئوپلیتیک")
    expect(html).toContain("نقشه جهان")
    expect(html).toContain("اجرای شبیه‌سازی")
    expect(html).toContain("disabled")

    // One path per Natural Earth 110m country minus Antarctica
    expect(html.match(/class="country"/g)).toHaveLength(176)

    // No country is selected or labeled on first render
    expect(html).not.toContain("country-label")
    expect(html).not.toContain("country-tooltip")
  })

  it("renders the settings gear but keeps the settings modal closed", () => {
    const html = renderToString(<App />)

    expect(html).toContain('aria-label="تنظیمات"')
    expect(html).not.toContain("پاک کردن نتایج حافظه")
    expect(html).not.toContain("آدرس پایه")
  })

  it("renders a header toggle that defaults to the bilateral sim", () => {
    const html = renderToString(<App />)

    expect(html).toContain("شبیه‌سازی دوجانبه")
    expect(html).toContain("سناریوی درگیری")
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).not.toContain("اجرای تحلیل درگیری")
  })
})
