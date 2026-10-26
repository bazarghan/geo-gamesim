import { useLanguage } from "../useLanguage"
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
  const { t } = useLanguage()
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
        <h2 id="settings-title">{t("تنظیمات")}</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-field">
            <label htmlFor="settings-base-url">{t("آدرس پایه")}</label>
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
            <label htmlFor="settings-api-key">{t("کلید API")}</label>
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
            <label htmlFor="settings-model">{t("نام مدل")}</label>
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
              {t("پاک کردن نتایج حافظه")}
            </button>
            <button type="button" className="ghost-button" onClick={onClose}>
              {t("بستن")}
            </button>
            <button type="submit" className="save-button">
              {t("ذخیره")}
            </button>
          </div>

          {saved && (
            <p className="saved-feedback" role="status">
              {t("تنظیمات ذخیره شد")}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
