import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'signature:theme'

type ThemeModeContextValue = {
  mode: ThemeChoice
  setMode: (mode: ThemeChoice) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function isChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function readInitialTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  if (isChoice(fromUrl)) {
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl)
    } catch {
      // ignore private mode
    }
    return fromUrl
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isChoice(stored)) return stored
  } catch {
    // ignore private mode
  }
  return 'system'
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setModeState] = useState<ThemeChoice>(readInitialTheme)

  const setMode = useCallback((next: ThemeChoice) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private mode
    }
  }, [])

  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  const theme = useMemo(() => createTheme({ palette: { mode: resolved } }), [resolved])
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider')
  return ctx
}
