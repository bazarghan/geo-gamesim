/** Where the LLM endpoint configuration lives between reloads. */
export const SETTINGS_STORAGE_KEY = "geo-gamesim.settings"

export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

/**
 * Configuration for any OpenAI-compatible LLM endpoint. The API key is
 * persisted to localStorage and never logged or sent anywhere else.
 */
export type Settings = {
  readonly baseUrl: string
  readonly apiKey: string
  readonly model: string
}

/** Settings as they appear before anything has been configured. */
export function defaultSettings(): Settings {
  return { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: "" }
}

export function loadSettings(storage: Storage): Settings {
  const raw = storage.getItem(SETTINGS_STORAGE_KEY)
  if (raw === null) return defaultSettings()
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      baseUrl: isNonEmptyString(parsed.baseUrl) ? parsed.baseUrl : DEFAULT_BASE_URL,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
    }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(storage: Storage, settings: Settings): void {
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

/** A Storage implementation with no backing store, for non-browser runs. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key) {
      return map.get(key) ?? null
    },
    key(index) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key) {
      map.delete(key)
    },
    setItem(key, value) {
      map.set(key, value)
    },
  }
}

/** localStorage in the browser; an in-memory stand-in everywhere else. */
export function getLocalStorage(): Storage {
  return typeof window === "undefined" ? createMemoryStorage() : window.localStorage
}
