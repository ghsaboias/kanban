export interface Theme {
  name: string
  key?: string
  // App surfaces
  background: string
  surface: string
  surfaceAlt: string
  card: string
  border: string
  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string
  // Accent
  accent: string
  accentHover: string
  accentText: string
  // Misc
  muted: string
  inputBg: string
  // Optional extended tokens
  brand?: string
  action?: string
  link?: string
  focus?: string
  danger?: string
  success?: string
  overlay?: string
  radius?: { sm: string, md: string, lg: string }
  shadow?: { sm: string, md: string, lg: string }
  // Priority badges
  priority: {
    HIGH: string
    MEDIUM: string
    LOW: string
  }
}

export const lightTheme: Theme = {
  name: 'Light',
  key: 'light',
  background: '#fafbfc',
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
  brand: '#222f44',
  action: '#3898ec',
  link: '#3898ec',
  focus: '#3898ec',
  danger: '#ea384c',
  success: '#28a745',
  overlay: 'rgba(0,0,0,0.10)',
  radius: { sm: '4px', md: '8px', lg: '12px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.1)',
    md: '0 2px 8px rgba(0,0,0,0.12)',
    lg: '0 12px 32px rgba(0,0,0,0.2)'
  },
  priority: {
    HIGH: '#ff6b6b',
    MEDIUM: '#ffd93d',
    LOW: '#6bcf7f',
  },
}

export const darkTheme: Theme = {
  name: 'Dark',
  key: 'dark',
  background: '#0f141a',
  surface: '#171b21',
  surfaceAlt: '#1c232c',
  card: '#1b2129',
  border: '#2a2f36',
  textPrimary: '#e6edf3',
  textSecondary: '#c7d0d9',
  textMuted: '#8b98a5',
  accent: '#2dd4bf',
  accentHover: '#22c5b1',
  accentText: '#0f141a',
  muted: '#94a3b8',
  inputBg: '#111827',
  brand: '#222f44',
  action: '#4ea0ff',
  link: '#4ea0ff',
  focus: '#4ea0ff',
  danger: '#ea384c',
  success: '#34d399',
  overlay: 'rgba(0,0,0,0.35)',
  radius: { sm: '4px', md: '8px', lg: '12px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 2px 8px rgba(0,0,0,0.35)',
    lg: '0 12px 32px rgba(0,0,0,0.45)'
  },
  priority: {
    HIGH: '#f87171',
    MEDIUM: '#f59e0b',
    LOW: '#34d399',
  },
}

export const warmTheme: Theme = {
  name: 'Warm',
  key: 'warm',
  background: '#fffaf5',
  surface: '#fff7ed',
  surfaceAlt: '#fff3e6',
  card: '#fffaf0',
  border: '#f2e8da',
  textPrimary: '#3f2d20',
  textSecondary: '#4b3626',
  textMuted: '#7a6a5e',
  accent: '#ff8a3d',
  accentHover: '#ff7a1f',
  accentText: '#1f1309',
  muted: '#8c7b72',
  inputBg: '#fff3e6',
  brand: '#8c5a2b',
  action: '#ff7a1f',
  link: '#ff7a1f',
  focus: '#ff7a1f',
  danger: '#e85d5d',
  success: '#5fbf75',
  overlay: 'rgba(0,0,0,0.10)',
  radius: { sm: '4px', md: '8px', lg: '12px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.1)',
    md: '0 2px 8px rgba(0,0,0,0.12)',
    lg: '0 12px 32px rgba(0,0,0,0.2)'
  },
  priority: {
    HIGH: '#e85d5d',
    MEDIUM: '#eebc40',
    LOW: '#5fbf75',
  },
}

export const igcTheme: Theme = {
  name: 'IGC',
  key: 'igc',
  // Brand-inspired light theme
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f5',
  card: '#ffffff',
  border: '#e2e2e2',
  textPrimary: '#333333',
  textSecondary: '#5d6c7b',
  textMuted: '#758696',
  accent: '#cbaa58', // gold
  accentHover: '#b8954d',
  accentText: '#ffffff',
  muted: '#6c757d',
  inputBg: '#f3f3f3',
  brand: '#222f44',
  action: '#3898ec',
  link: '#3898ec',
  focus: '#3898ec',
  danger: '#ea384c',
  success: '#28a745',
  overlay: 'rgba(0,0,0,0.10)',
  radius: { sm: '4px', md: '8px', lg: '12px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.1)',
    md: '0 2px 8px rgba(0,0,0,0.12)',
    lg: '0 12px 32px rgba(0,0,0,0.2)'
  },
  priority: {
    HIGH: '#ea384c',
    MEDIUM: '#d3a93d',
    LOW: '#34d399',
  },
}

export const THEMES: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  warm: warmTheme,
  igc: igcTheme,
}

// Simple color utils to derive variants
function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

function hexToRgb(hex: string) {
  const m = hex.replace('#', '')
  const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function lighten(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r + (255 - r) * clamp01(amount))
  const ng = Math.round(g + (255 - g) * clamp01(amount))
  const nb = Math.round(b + (255 - b) * clamp01(amount))
  return rgbToHex(nr, ng, nb)
}

function darken(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r * (1 - clamp01(amount)))
  const ng = Math.round(g * (1 - clamp01(amount)))
  const nb = Math.round(b * (1 - clamp01(amount)))
  return rgbToHex(nr, ng, nb)
}

export type Variant = { name: string, theme: Theme }

export function generateVariants(base: Theme): Variant[] {
  return [
    {
      name: 'Softer',
      theme: {
        ...base,
        name: base.name + ' • Softer',
        background: lighten(base.background, 0.05),
        surface: lighten(base.surface, 0.06),
        card: lighten(base.card, 0.06),
        border: lighten(base.border, 0.08),
        textSecondary: lighten(base.textSecondary, 0.05),
        textMuted: lighten(base.textMuted, 0.08),
        accent: lighten(base.accent, 0.08),
        accentHover: lighten(base.accentHover, 0.08),
      },
    },
    {
      name: 'Contrast',
      theme: {
        ...base,
        name: base.name + ' • Contrast',
        background: darken(base.background, 0.06),
        surface: darken(base.surface, 0.08),
        card: darken(base.card, 0.08),
        border: darken(base.border, 0.12),
        textPrimary: lighten(base.textPrimary, 0.05),
        textSecondary: lighten(base.textSecondary, 0.05),
        accent: darken(base.accent, 0.12),
        accentHover: darken(base.accentHover, 0.12),
      },
    },
    {
      name: 'Vibrant',
      theme: {
        ...base,
        name: base.name + ' • Vibrant',
        accent: lighten(base.accent, 0.16),
        accentHover: lighten(base.accentHover, 0.16),
        textPrimary: base.textPrimary,
      },
    },
    {
      name: 'Muted',
      theme: {
        ...base,
        name: base.name + ' • Muted',
        accent: darken(base.accent, 0.18),
        accentHover: darken(base.accentHover, 0.18),
        textSecondary: darken(base.textSecondary, 0.06),
        textMuted: darken(base.textMuted, 0.08),
      },
    },
  ]
}
