import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { Theme } from './themes'
import { THEMES, lightTheme } from './themes'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  available: Record<string, Theme>
  persist: boolean
  setPersist: (p: boolean) => void
  // Optional runtime transform (e.g., UI profiles overriding radius/shadow)
  setTransform?: (fn: ((t: Theme | null) => Theme) | null) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export { ThemeContext }

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
    } catch { /* ignore */ }
    return lightTheme
  })
  const [transform, setTransform] = useState<((t: Theme | null) => Theme) | null>(null)
  const theme = useMemo<Theme>(() => {
    if (transform && typeof transform === 'function') {
      return transform(baseTheme)
    }
    return baseTheme
  }, [baseTheme, transform])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      if (persist) localStorage.setItem(LS_KEY, JSON.stringify(t))
    } catch { /* ignore */ }
  }, [persist])

  const safeSetTransform = useCallback((fn: ((t: Theme | null) => Theme) | null) => {
    if (fn === null || typeof fn === 'function') {
      setTransform(fn)
    } else {
      console.warn('setTransform called with invalid value:', fn)
    }
  }, [])

  useEffect(() => {
    try {
      if (persist) localStorage.setItem(LS_PERSIST, '1')
      else localStorage.removeItem(LS_PERSIST)
      // If disabling persistence, also clear saved theme
      if (!persist) localStorage.removeItem(LS_KEY)
    } catch { /* ignore */ }
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
    setTransform: safeSetTransform,
  }), [theme, persist, setTheme, safeSetTransform])

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
