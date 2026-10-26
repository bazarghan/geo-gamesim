import { createContext, useContext } from "react"
import { countryName, translate, type Language } from "./i18n"

export const LanguageContext = createContext<Language>("fa")
export const SetLanguageContext = createContext<(language: Language) => void>(() => {})
export const LANGUAGE_STORAGE_KEY = "geo-gamesim.language"

export function useLanguage() {
  const language = useContext(LanguageContext)
  const setLanguage = useContext(SetLanguageContext)
  return {
    language,
    setLanguage,
    t: (text: string, values?: Readonly<Record<string, string | number>>) =>
      translate(text, language, values),
    countryName: (name: string) => countryName(name, language),
  }
}
