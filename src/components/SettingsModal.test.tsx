import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import SettingsModal from "./SettingsModal"
import { DEFAULT_BASE_URL } from "../settings/settings"

const noop = () => {}

describe("SettingsModal", () => {
  it("renders all three fields with the default base URL and a clear-cache button", () => {
    const html = renderToString(
      <SettingsModal
        settings={{ baseUrl: DEFAULT_BASE_URL, apiKey: "", model: "" }}
        onSave={noop}
        onClose={noop}
        onClearCache={noop}
      />,
    )

    expect(html).toContain("آدرس پایه")
    expect(html).toContain("کلید API")
    expect(html).toContain("نام مدل")
    expect(html).toContain(DEFAULT_BASE_URL)
    expect(html).toContain("پاک کردن نتایج حافظه")
    expect(html).toContain("ذخیره")
  })

  it("masks the API key input and shows no saved feedback before saving", () => {
    const html = renderToString(
      <SettingsModal
        settings={{ baseUrl: DEFAULT_BASE_URL, apiKey: "sk-secret", model: "" }}
        onSave={noop}
        onClose={noop}
        onClearCache={noop}
      />,
    )

    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="off"')
    expect(html).not.toContain("تنظیمات ذخیره شد")
  })
})
