import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { THEMES, lightTheme } from './themes'
import type { Theme } from './themes'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  available: Record<string, Theme>
  persist: boolean
  setPersist: (p: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const LS_KEY = 'kanban_theme_current'
const LS_PERSIST = 'kanban_theme_persist'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [persist, setPersist] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_PERSIST) === '1'
    } catch {
      return false
    }
  })
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return lightTheme
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try {
      if (persist) localStorage.setItem(LS_KEY, JSON.stringify(t))
    } catch {}
  }

  useEffect(() => {
    try {
      if (persist) localStorage.setItem(LS_PERSIST, '1')
      else localStorage.removeItem(LS_PERSIST)
      // If disabling persistence, also clear saved theme
      if (!persist) localStorage.removeItem(LS_KEY)
    } catch {}
  }, [persist])

  // Apply background color to body for global feel
  useEffect(() => {
    document.body.style.backgroundColor = theme.background
    document.body.style.color = theme.textPrimary
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    available: THEMES,
    persist,
    setPersist,
  }), [theme, persist])

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

