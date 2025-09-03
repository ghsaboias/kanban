// M&A-focused appearance system types

export type BaseMode = 'light' | 'dark' | 'auto'

// Removed M&A presets - now use Simple (base themes) + Advanced (custom) only

export type Palette = 'neutral' | 'navy' | 'slate' | 'emerald' | 'burgundy' | 'monochrome'

export type Density = 'compact' | 'comfortable' | 'presentation'

export type Separation = 'subtle' | 'clear'

export type CornerStyle = 'subtle' | 'standard' | 'rounded'

export interface EmphasisToggles {
  owners: boolean
  deadlines: boolean
  riskFlags: boolean
}

export interface AdvancedSettings {
  palette: Palette
  density: Density
  separation: Separation
  emphasis: EmphasisToggles
  corners: CornerStyle
}

export interface AppearanceConfig {
  mode: BaseMode
  // Removed preset - now using Simple (mode) + Advanced (advanced) only
  advanced?: AdvancedSettings
  complianceLocked?: boolean
}

export interface MATheme {
  name: string
  key: string
  
  // Core surfaces
  background: string
  surface: string
  surfaceAlt: string
  card: string
  border: string
  
  // Text hierarchy
  textPrimary: string
  textSecondary: string
  textMuted: string
  
  // Interactive  
  accent: string
  accentHover: string
  accentText: string
  
  // Legacy compatibility
  muted: string
  inputBg: string
  overlay?: string
  brand?: string
  action?: string
  link?: string
  focus?: string
  
  // Status indicators
  success: string
  warning: string
  danger: string
  info: string
  
  // M&A specific
  priority: {
    critical: string
    HIGH: string  // Legacy compatibility
    high: string
    MEDIUM: string  // Legacy compatibility  
    medium: string
    LOW: string  // Legacy compatibility
    low: string
  }
  
  risk: {
    high: string
    medium: string
    low: string
  }
  
  status: {
    active: string
    pending: string
    complete: string
    blocked: string
  }
  
  // Layout
  radius: { sm: string; md: string; lg: string }
  shadow: { sm: string; md: string; lg: string }
  spacing: { xs: string; sm: string; md: string; lg: string; xl: string }
  
  // Typography
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
  }
  
  // M&A emphasis
  emphasis: {
    owner: string
    deadline: string
    attachment: string
    riskFlag: string
  }
}
