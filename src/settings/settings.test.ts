import { describe, expect, it } from "vitest"
import {
  createMemoryStorage,
  DEFAULT_BASE_URL,
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from "./settings"

describe("settings", () => {
  it("defaults the base URL and blanks API key and model when nothing is stored", () => {
    const storage = createMemoryStorage()

    expect(loadSettings(storage)).toEqual({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: "",
      model: "",
    })
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })

  it("persists all three fields across save and reload", () => {
    const storage = createMemoryStorage()
    saveSettings(storage, {
      baseUrl: "http://localhost:11434/v1",
      apiKey: "sk-test",
      model: "llama3",
    })

    expect(loadSettings(storage)).toEqual({
      baseUrl: "http://localhost:11434/v1",
      apiKey: "sk-test",
      model: "llama3",
    })
  })

  it("accepts any URL shape as the base URL", () => {
    const storage = createMemoryStorage()
    saveSettings(storage, { baseUrl: "my-proxy.internal:9000/v1/", apiKey: "", model: "" })

    expect(loadSettings(storage).baseUrl).toBe("my-proxy.internal:9000/v1/")
  })

  it("falls back to defaults when the stored JSON is corrupt", () => {
    const storage = createMemoryStorage()
    storage.setItem(SETTINGS_STORAGE_KEY, "{not json")

    expect(loadSettings(storage).baseUrl).toBe(DEFAULT_BASE_URL)
  })

  it("falls back to the default base URL when the stored value is empty", () => {
    const storage = createMemoryStorage()
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ baseUrl: "", apiKey: "", model: "" }))

    expect(loadSettings(storage).baseUrl).toBe(DEFAULT_BASE_URL)
  })
})
