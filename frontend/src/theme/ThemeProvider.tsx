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
  // Optional runtime transform (e.g., UI profiles overriding radius/shadow)
  setTransform?: (fn: ((t: Theme) => Theme) | null) => void
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
  // Base theme stored here; UI layers can transform this via setTransform
  const [baseTheme, setThemeState] = useState<Theme>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return lightTheme
  })
  const [transform, setTransform] = useState<((t: Theme) => Theme) | null>(null)
  const theme = useMemo<Theme>(() => transform ? transform(baseTheme) : baseTheme, [baseTheme, transform])

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
    setTransform,
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
