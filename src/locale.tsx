import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { messages, type Locale, type MessageKey } from './messages'

const STORAGE_KEY = 'signature:locale'
export const LOCALES = ['en', 'lt'] as const

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  lt: 'Lietuvių',
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'lt'
}

export function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'lt'
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (isLocale(fromUrl)) {
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl)
    } catch {
      // ignore private mode
    }
    return fromUrl
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // ignore private mode
  }
  const nav = navigator.language.toLowerCase()
  if (nav === 'lt' || nav.startsWith('lt-')) return 'lt'
  return 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private mode
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = messages[locale].title
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => {
    const t = (key: MessageKey) => messages[locale][key]
    return { locale, setLocale, t }
  }, [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
