import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/themes'

export type UIProfile = {
  key: string
  name: string
  description?: string
  // knobs
  rounding: 'sharp' | 'rounded' | 'soft'
  elevation: 'flat' | 'elevated'
}

const UI_PROFILES: UIProfile[] = [
  { key: 'default', name: 'Default', description: 'Current theme values', rounding: 'rounded', elevation: 'elevated' },
  { key: 'sharp-flat', name: 'Sharp • Flat', description: 'Square corners, no shadows', rounding: 'sharp', elevation: 'flat' },
  { key: 'soft-elevated', name: 'Soft • Elevated', description: 'Softer corners, subtle elevation', rounding: 'soft', elevation: 'elevated' },
]

type UIContextValue = {
  profile: UIProfile
  setProfileKey: (key: string) => void
  profiles: UIProfile[]
}

const UIContext = createContext<UIContextValue | null>(null)

const LS_KEY = 'kanban_ui_profile'

function applyProfileToTheme(profile: UIProfile) {
  return (t: Theme): Theme => {
    // Derive radius per rounding
    const radius = profile.rounding === 'sharp'
      ? { sm: '0px', md: '0px', lg: '0px' }
      : profile.rounding === 'soft'
        ? { sm: '6px', md: '10px', lg: '14px' }
        : (t.radius ?? { sm: '4px', md: '8px', lg: '12px' })

    // Derive shadows per elevation
    const shadow = profile.elevation === 'flat'
      ? { sm: 'none', md: 'none', lg: 'none' }
      : (t.shadow ?? { sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 2px 8px rgba(0,0,0,0.12)', lg: '0 12px 32px rgba(0,0,0,0.2)' })

    return { ...t, radius, shadow }
  }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const { setTransform } = useTheme()
  const [profileKey, setProfileKey] = useState<string>(() => {
    try { return localStorage.getItem(LS_KEY) || 'default' } catch { return 'default' }
  })

  const profile = useMemo(() => UI_PROFILES.find(p => p.key === profileKey) || UI_PROFILES[0], [profileKey])

  useEffect(() => {
    // Persist selection and apply transform
    try { localStorage.setItem(LS_KEY, profile.key) } catch {}
    setTransform?.(applyProfileToTheme(profile))
    // Cleanup not necessary; ThemeProvider holds transform until changed
  }, [profile.key])

  const value = useMemo<UIContextValue>(() => ({
    profile,
    setProfileKey,
    profiles: UI_PROFILES,
  }), [profile])

  return (
    <UIContext.Provider value={value}>{children}</UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}

