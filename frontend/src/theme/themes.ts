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
  priority: {
    HIGH: '#e85d5d',
    MEDIUM: '#eebc40',
    LOW: '#5fbf75',
  },
}

export const THEMES: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  warm: warmTheme,
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

