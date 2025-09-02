import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { Theme } from '../theme/themes'
import { useTheme } from '../theme/useTheme'

export type UIProfile = {
  key: string
  name: string
  description?: string
  // knobs
  rounding: 'sharp' | 'rounded' | 'soft'
  elevation: 'flat' | 'elevated'
}

export type CustomUIConfig = {
  rounding: 'sharp' | 'rounded' | 'soft'
  elevation: 'flat' | 'elevated'
  density: 'compact' | 'cozy' | 'comfortable'
  borderStrength: 'light' | 'normal' | 'strong'
  contrast: 'low' | 'normal' | 'high'
}

const UI_PROFILES: UIProfile[] = [
  { key: 'default', name: 'Default', description: 'Use the base theme as-is', rounding: 'rounded', elevation: 'elevated' },
  { key: 'sharp-flat', name: 'Sharp • Flat', description: 'Square corners, flat layers, clearer dividers', rounding: 'sharp', elevation: 'flat' },
  { key: 'soft-elevated', name: 'Soft • Elevated', description: 'Softer corners, gentle depth, lighter borders', rounding: 'soft', elevation: 'elevated' },
  { key: 'minimal-ghost', name: 'Minimal • Ghost', description: 'Subtle borders, flatter cards, airy look', rounding: 'rounded', elevation: 'flat' },
  { key: 'high-contrast', name: 'High Contrast', description: 'Stronger dividers and emphasis for clarity', rounding: 'rounded', elevation: 'elevated' },
  { key: 'neumorphic', name: 'Neumorphic', description: 'Soft light surfaces, gentle depth', rounding: 'soft', elevation: 'elevated' },
  { key: 'glass', name: 'Glass', description: 'Frosted glass look, airy overlays', rounding: 'rounded', elevation: 'elevated' },
  { key: 'terminal', name: 'Terminal', description: 'Dark background, green accents, crisp borders', rounding: 'sharp', elevation: 'flat' },
  { key: 'modern-kanban', name: 'Modern Kanban', description: 'Clean, professional kanban board design', rounding: 'rounded', elevation: 'elevated' },
]

type UIContextValue = {
  profile: UIProfile
  setProfileKey: (key: string) => void
  profiles: UIProfile[]
  custom: CustomUIConfig
  setCustom: (cfg: CustomUIConfig) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export { UIContext }

const LS_KEY = 'kanban_ui_profile'
const LS_CUSTOM = 'kanban_ui_custom'

// Lightweight color utils (duped here to avoid cross-module exports)
function hexToRgb(hex: string) {
  const m = hex.replace('#', '')
  const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}
function lighten(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex)
  const nr = r + (255 - r) * amount
  const ng = g + (255 - g) * amount
  const nb = b + (255 - b) * amount
  return rgbToHex(nr, ng, nb)
}
function darken(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex)
  const nr = r * (1 - amount)
  const ng = g * (1 - amount)
  const nb = b * (1 - amount)
  return rgbToHex(nr, ng, nb)
}

function applyProfileToTheme(profile: UIProfile, custom?: CustomUIConfig) {
  return (t: Theme | null): Theme => {
    // Guard against null theme
    if (!t) {
      // Return a minimal valid theme if base theme is null
      return {
        name: 'Fallback',
        background: '#ffffff',
        surface: '#ffffff',
        surfaceAlt: '#f8f9fa',
        card: '#ffffff',
        border: '#e5e7eb',
        textPrimary: '#111111',
        textSecondary: '#333333',
        textMuted: '#666666',
        accent: '#007bff',
        accentHover: '#0069d9',
        accentText: '#ffffff',
        muted: '#6c757d',
        inputBg: '#f8f9fa',
        overlay: 'rgba(0,0,0,0.10)',
        priority: { HIGH: '#ff6b6b', MEDIUM: '#ffd93d', LOW: '#6bcf7f' },
        radius: profile.rounding === 'sharp'
          ? { sm: '0px', md: '0px', lg: '0px' }
          : profile.rounding === 'soft'
            ? { sm: '6px', md: '10px', lg: '14px' }
            : { sm: '4px', md: '8px', lg: '12px' },
        shadow: profile.elevation === 'flat'
          ? { sm: 'none', md: 'none', lg: 'none' }
          : { sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 2px 8px rgba(0,0,0,0.12)', lg: '0 12px 32px rgba(0,0,0,0.2)' }
      }
    }

    // Modern Kanban profile gets special theme overrides
    if (profile.key === 'modern-kanban') {
      return {
        ...t,
        name: 'Modern Kanban',
        background: '#f6f8fa',
        surface: '#ffffff',
        surfaceAlt: '#f6f8fa',
        card: '#ffffff',
        border: '#e1e8ed',
        textPrimary: '#1c2025',
        textSecondary: '#495057',
        textMuted: '#6c757d',
        accent: '#007AFF',
        accentHover: '#0056CC',
        accentText: '#ffffff',
        muted: '#8e959d',
        inputBg: '#ffffff',
        overlay: 'rgba(0,0,0,0.15)',
        priority: { HIGH: '#ff3b30', MEDIUM: '#ff9500', LOW: '#34c759' },
        radius: { sm: '6px', md: '8px', lg: '12px' },
        shadow: { 
          sm: '0 1px 3px rgba(0,0,0,0.08)', 
          md: '0 2px 8px rgba(0,0,0,0.10)', 
          lg: '0 4px 20px rgba(0,0,0,0.15)' 
        }
      }
    }

    // Additional dramatic profiles
    if (profile.key === 'neumorphic') {
      return {
        ...t,
        name: 'Neumorphic',
        background: '#eef1f5',
        surface: '#f7f9fc',
        surfaceAlt: '#eef1f5',
        card: '#ffffff',
        border: '#e8edf3',
        textPrimary: '#2a2f36',
        textSecondary: '#4b5563',
        textMuted: '#6b7280',
        accent: '#3b82f6',
        accentHover: '#2563eb',
        accentText: '#ffffff',
        inputBg: '#ffffff',
        overlay: 'rgba(0,0,0,0.08)',
        radius: { sm: '8px', md: '12px', lg: '18px' },
        shadow: {
          sm: 'inset 1px 1px 2px rgba(0,0,0,0.04), inset -1px -1px 2px rgba(255,255,255,0.6)',
          md: '0 8px 20px rgba(0,0,0,0.08)',
          lg: '0 16px 40px rgba(0,0,0,0.12)'
        },
        priority: t.priority
      }
    }

    if (profile.key === 'glass') {
      return {
        ...t,
        name: 'Glass',
        background: '#e6ebf3',
        surface: 'rgba(255,255,255,0.75)',
        surfaceAlt: 'rgba(255,255,255,0.55)',
        card: 'rgba(255,255,255,0.85)',
        border: 'rgba(255,255,255,0.6)',
        textPrimary: '#1f2937',
        textSecondary: '#374151',
        textMuted: '#6b7280',
        accent: '#0ea5e9',
        accentHover: '#0284c7',
        accentText: '#0f141a',
        inputBg: 'rgba(255,255,255,0.85)',
        overlay: 'rgba(15,20,26,0.2)',
        radius: { sm: '10px', md: '14px', lg: '20px' },
        shadow: { sm: '0 1px 3px rgba(0,0,0,0.06)', md: '0 6px 24px rgba(0,0,0,0.16)', lg: '0 16px 48px rgba(0,0,0,0.24)' },
        priority: t.priority
      }
    }

    if (profile.key === 'terminal') {
      return {
        ...t,
        name: 'Terminal',
        background: '#0b0f0c',
        surface: '#0f141a',
        surfaceAlt: '#0b0f0c',
        card: '#0f141a',
        border: '#213547',
        textPrimary: '#d1fae5',
        textSecondary: '#a7f3d0',
        textMuted: '#86efac',
        accent: '#34d399',
        accentHover: '#10b981',
        accentText: '#0b0f0c',
        inputBg: '#0b0f0c',
        overlay: 'rgba(0,255,153,0.08)',
        radius: { sm: '2px', md: '4px', lg: '6px' },
        shadow: { sm: 'none', md: 'none', lg: 'none' },
        priority: { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }
      }
    }

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

    // Start from base + radius/shadow
    const base: Theme = { ...t, radius, shadow }

    // Handle Custom profile with density and clarity knobs
    if (profile.key === 'custom' && custom) {
      const densityFactor = custom.density === 'compact' ? 0.9 : custom.density === 'comfortable' ? 1.1 : 1.0
      const spacing = base.spacing ?? { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' }
      const toNum = (px: string) => Number(px.replace('px', '')) || 0
      const toPx = (n: number) => `${Math.round(n)}px`
      const scaled: Theme['spacing'] = {
        xs: toPx(toNum(spacing.xs) * densityFactor),
        sm: toPx(toNum(spacing.sm) * densityFactor),
        md: toPx(toNum(spacing.md) * densityFactor),
        lg: toPx(toNum(spacing.lg) * densityFactor),
        xl: toPx(toNum(spacing.xl) * densityFactor),
      }

      const border = custom.borderStrength === 'light'
        ? lighten(base.border, 0.1)
        : custom.borderStrength === 'strong'
          ? darken(base.border, 0.15)
          : base.border

      const contrastTweak = custom.contrast === 'low'
        ? { textPrimary: lighten(base.textPrimary, 0.08), textSecondary: lighten(base.textSecondary, 0.08) }
        : custom.contrast === 'high'
          ? { textPrimary: darken(base.textPrimary, 0.1), textSecondary: darken(base.textSecondary, 0.1) }
          : {}

      return {
        ...base,
        spacing: scaled,
        density: custom.density,
        border,
        ...contrastTweak,
      }
    }

    // Additional per-profile adjustments for stronger visual variety
    if (profile.key === 'sharp-flat') {
      return {
        ...base,
        surfaceAlt: base.surface,
        inputBg: base.surface,
        border: darken(base.border, 0.12),
        textSecondary: darken(base.textSecondary, 0.05),
        textMuted: darken(base.textMuted, 0.08),
        overlay: 'rgba(0,0,0,0.08)'
      }
    }

    if (profile.key === 'soft-elevated') {
      return {
        ...base,
        background: lighten(base.background, 0.03),
        surfaceAlt: lighten(base.surfaceAlt, 0.03),
        border: lighten(base.border, 0.06),
        accent: lighten(base.accent, 0.06),
        accentHover: lighten(base.accentHover, 0.06),
        overlay: 'rgba(0,0,0,0.18)'
      }
    }

    if (profile.key === 'minimal-ghost') {
      return {
        ...base,
        // Flatter layers and very subtle dividers
        card: base.surface,
        surfaceAlt: lighten(base.surface, 0.02),
        inputBg: lighten(base.inputBg, 0.02),
        border: lighten(base.border, 0.12),
        textSecondary: lighten(base.textSecondary, 0.04),
        textMuted: lighten(base.textMuted, 0.08),
        overlay: 'rgba(0,0,0,0.06)',
        shadow: { sm: 'none', md: 'none', lg: 'none' },
        radius: { sm: '2px', md: '4px', lg: '8px' }
      }
    }

    if (profile.key === 'high-contrast') {
      return {
        ...base,
        border: darken(base.border, 0.18),
        textPrimary: darken(base.textPrimary, 0.12),
        textSecondary: darken(base.textSecondary, 0.12),
        overlay: 'rgba(0,0,0,0.20)'
      }
    }

    return base
  }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const { setTransform } = useTheme()
  const [profileKey, setProfileKey] = useState<string>(() => {
    try { return localStorage.getItem(LS_KEY) || 'default' } catch { return 'default' }
  })
  const [custom, setCustomState] = useState<CustomUIConfig>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM)
      if (raw) return JSON.parse(raw) as CustomUIConfig
    } catch {
      // Ignore localStorage parsing errors
    }
    return { rounding: 'rounded', elevation: 'elevated', density: 'cozy', borderStrength: 'normal', contrast: 'normal' }
  })

  const profile = useMemo(() => UI_PROFILES.find(p => p.key === profileKey) || UI_PROFILES[0], [profileKey])

  useEffect(() => {
    // Persist selection and apply transform
    try { localStorage.setItem(LS_KEY, profile.key) } catch { /* ignore */ }
    setTransform?.(applyProfileToTheme(profile, custom))
    // Cleanup not necessary; ThemeProvider holds transform until changed
  }, [profile.key, profile, custom, setTransform])

  const setCustom = useCallback((cfg: CustomUIConfig) => {
    setCustomState(cfg)
    try { localStorage.setItem(LS_CUSTOM, JSON.stringify(cfg)) } catch { /* ignore */ }
    if (profile.key !== 'custom') setProfileKey('custom')
  }, [profile.key, setProfileKey])

  const value = useMemo<UIContextValue>(() => ({
    profile,
    setProfileKey,
    profiles: UI_PROFILES,
    custom,
    setCustom,
  }), [profile, custom, setCustom])

  return (
    <UIContext.Provider value={value}>{children}</UIContext.Provider>
  )
}
