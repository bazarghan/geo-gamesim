import { useEffect, useState, type FormEvent } from "react"
import { DEFAULT_BASE_URL, type Settings } from "../settings/settings"

type SettingsModalProps = {
  readonly settings: Settings
  readonly onSave: (settings: Settings) => void
  readonly onClose: () => void
  readonly onClearCache: () => void
}

export default function SettingsModal({
  settings,
  onSave,
  onClose,
  onClearCache,
}: SettingsModalProps) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
    setSaved(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title">Settings</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-field">
            <label htmlFor="settings-base-url">Base URL</label>
            <input
              id="settings-base-url"
              type="text"
              inputMode="url"
              spellCheck={false}
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value)
                setSaved(false)
              }}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="settings-api-key">API key</label>
            <input
              id="settings-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value)
                setSaved(false)
              }}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="settings-model">Model name</label>
            <input
              id="settings-model"
              type="text"
              spellCheck={false}
              value={model}
              onChange={(event) => {
                setModel(event.target.value)
                setSaved(false)
              }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClearCache}>
              Clear cached results
            </button>
            <button type="button" className="ghost-button" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="save-button">
              Save
            </button>
          </div>

          {saved && (
            <p className="saved-feedback" role="status">
              Settings saved
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
