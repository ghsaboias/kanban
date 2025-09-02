import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { AppearanceConfig, BaseMode, MAPreset, MATheme, AdvancedSettings } from './types'
import { createMAPreset, baseLight, baseDark } from './presets'
import { applyAdvancedSettings } from './utils'

type AppearanceContextValue = {
  theme: MATheme
  config: AppearanceConfig
  setMode: (mode: BaseMode) => void
  setPreset: (preset: MAPreset | null) => void
  setAdvanced: (settings: AdvancedSettings) => void
  resetToDefaults: () => void
  availablePresets: MAPreset[]
  locked: boolean
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export { AppearanceContext }

const LS_KEY = 'kanban_ma_appearance'
const DEFAULT_CONFIG: AppearanceConfig = {
  mode: 'auto',
  preset: undefined,
  advanced: {
    palette: 'neutral',
    density: 'compact', 
    separation: 'clear',
    emphasis: {
      owners: true,
      deadlines: true,
      riskFlags: true,
    },
    corners: 'subtle',
  },
  complianceLocked: false,
}

const AVAILABLE_PRESETS: MAPreset[] = [
  'pipeline-review',
  'diligence-tracker',
  'ic-presentation', 
  'night-work',
  'redline-legal',
  'deal-room-readout',
  'analytics-view',
]

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveBaseTheme(mode: BaseMode): MATheme {
  if (mode === 'auto') {
    return getSystemTheme() === 'dark' ? baseDark : baseLight
  }
  return mode === 'dark' ? baseDark : baseLight
}

type AppearanceProviderProps = {
  children: ReactNode
  // Optional org-level defaults to bootstrap users
  orgDefaults?: Partial<AppearanceConfig>
  // Optional hard lock from admin; when true, users cannot change appearance
  complianceLocked?: boolean
}

export function AppearanceProvider({ children, orgDefaults, complianceLocked }: AppearanceProviderProps) {
  const [config, setConfig] = useState<AppearanceConfig>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as AppearanceConfig
        // Merge with defaults to handle new fields
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          advanced: {
            ...DEFAULT_CONFIG.advanced!,
            ...parsed.advanced,
          },
        } as AppearanceConfig
      }
    } catch {
      // Ignore localStorage errors
    }
    // If nothing saved, seed with org defaults when provided
    const seeded: AppearanceConfig = {
      ...DEFAULT_CONFIG,
      ...(orgDefaults || {}),
      advanced: {
        ...DEFAULT_CONFIG.advanced!,
        ...(orgDefaults?.advanced || {}),
      },
      complianceLocked: orgDefaults?.complianceLocked ?? DEFAULT_CONFIG.complianceLocked,
    }
    return seeded
  })

  // Derived theme based on current config
  const theme = useMemo<MATheme>(() => {
    let baseTheme: MATheme
    
    if (config.preset) {
      // Use M&A preset
      baseTheme = createMAPreset(config.preset)
    } else {
      // Use base theme with mode
      baseTheme = resolveBaseTheme(config.mode)
    }
    
    // Apply advanced settings if provided
    if (config.advanced) {
      return applyAdvancedSettings(baseTheme, config.advanced)
    }
    
    return baseTheme
  }, [config])

  // Persist config changes
  const persistConfig = useCallback((newConfig: AppearanceConfig) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newConfig))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Listen to system theme changes for auto mode
  useEffect(() => {
    if (config.mode !== 'auto') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Force re-render when system theme changes
      setConfig(c => ({ ...c }))
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [config.mode])

  // Apply theme to document
  useEffect(() => {
    document.body.style.backgroundColor = theme.background
    document.body.style.color = theme.textPrimary
    
    // Set CSS custom properties for global access
    const root = document.documentElement
    root.style.setProperty('--color-background', theme.background)
    root.style.setProperty('--color-surface', theme.surface)
    root.style.setProperty('--color-card', theme.card)
    root.style.setProperty('--color-border', theme.border)
    root.style.setProperty('--color-text-primary', theme.textPrimary)
    root.style.setProperty('--color-text-secondary', theme.textSecondary)
    root.style.setProperty('--color-text-muted', theme.textMuted)
    root.style.setProperty('--color-accent', theme.accent)
    root.style.setProperty('--color-accent-hover', theme.accentHover)
    root.style.setProperty('--color-accent-text', theme.accentText)
    
    // M&A specific properties
    root.style.setProperty('--color-priority-critical', theme.priority.critical)
    root.style.setProperty('--color-priority-high', theme.priority.high)
    root.style.setProperty('--color-priority-medium', theme.priority.medium)
    root.style.setProperty('--color-priority-low', theme.priority.low)
    
    root.style.setProperty('--color-risk-high', theme.risk.high)
    root.style.setProperty('--color-risk-medium', theme.risk.medium)
    root.style.setProperty('--color-risk-low', theme.risk.low)
    
    root.style.setProperty('--color-status-active', theme.status.active)
    root.style.setProperty('--color-status-pending', theme.status.pending)
    root.style.setProperty('--color-status-complete', theme.status.complete)
    root.style.setProperty('--color-status-blocked', theme.status.blocked)
    
    // Layout properties
    root.style.setProperty('--radius-sm', theme.radius.sm)
    root.style.setProperty('--radius-md', theme.radius.md)
    root.style.setProperty('--radius-lg', theme.radius.lg)
    
    root.style.setProperty('--shadow-sm', theme.shadow.sm)
    root.style.setProperty('--shadow-md', theme.shadow.md)
    root.style.setProperty('--shadow-lg', theme.shadow.lg)
    
    root.style.setProperty('--spacing-xs', theme.spacing.xs)
    root.style.setProperty('--spacing-sm', theme.spacing.sm)
    root.style.setProperty('--spacing-md', theme.spacing.md)
    root.style.setProperty('--spacing-lg', theme.spacing.lg)
    root.style.setProperty('--spacing-xl', theme.spacing.xl)
    
  }, [theme])

  const locked = Boolean(complianceLocked ?? config.complianceLocked)

  const setMode = useCallback((mode: BaseMode) => {
    if (locked) return
    const newConfig = { ...config, mode, preset: undefined }
    setConfig(newConfig)
    persistConfig(newConfig)
  }, [config, persistConfig, locked])

  const setPreset = useCallback((preset: MAPreset | null) => {
    if (locked) return
    const newConfig = { ...config, preset: preset || undefined }
    setConfig(newConfig)
    persistConfig(newConfig)
  }, [config, persistConfig, locked])

  const setAdvanced = useCallback((settings: AdvancedSettings) => {
    if (locked) return
    const newConfig = { ...config, advanced: settings }
    setConfig(newConfig)
    persistConfig(newConfig)
  }, [config, persistConfig, locked])

  const resetToDefaults = useCallback(() => {
    if (locked) return
    const next = {
      ...DEFAULT_CONFIG,
      // if provider prop enforces lock/defaults, preserve that flag
      complianceLocked: Boolean(complianceLocked ?? DEFAULT_CONFIG.complianceLocked)
    }
    setConfig(next)
    persistConfig(next)
  }, [persistConfig, locked, complianceLocked])

  const value = useMemo<AppearanceContextValue>(() => ({
    theme,
    config,
    setMode,
    setPreset,
    setAdvanced,
    resetToDefaults,
    availablePresets: AVAILABLE_PRESETS,
    locked,
  }), [theme, config, setMode, setPreset, setAdvanced, resetToDefaults, locked])

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
