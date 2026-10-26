import { useEffect, useRef, type ReactNode } from "react"
import { useLanguage } from "../useLanguage"

type Props = { title: string; onClose: () => void; children: ReactNode }

/** Native modal dialog supplies focus trapping, background inertness and Escape. */
export default function SimulationDialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useLanguage()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = "hidden"
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="simulation-dialog"
      aria-labelledby="simulation-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
    >
      <header className="dialog-header">
        <h2 id="simulation-title">{title}</h2>
        <button
          type="button"
          className="dialog-close"
          aria-label={t("بستن پنجره شبیه‌سازی")}
          onClick={onClose}
          autoFocus
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  )
}
