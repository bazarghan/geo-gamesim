import { useEffect, useState, type ReactNode } from "react"
import type { Language } from "./i18n"
import { LanguageContext, SetLanguageContext, LANGUAGE_STORAGE_KEY } from "./useLanguage"

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [language, setLanguage] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "fa"
    } catch {
      return "fa"
    }
  })
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr"
    document.title =
      language === "fa"
        ? "شبیه‌ساز ژئوپلیتیک | Geo GameSim"
        : "Geo GameSim | Geopolitical Simulator"
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      /* Storage may be disabled. */
    }
  }, [language])
  return (
    <LanguageContext.Provider value={language}>
      <SetLanguageContext.Provider value={setLanguage}>{children}</SetLanguageContext.Provider>
    </LanguageContext.Provider>
  )
}
