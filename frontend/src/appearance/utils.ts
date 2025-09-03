import type { AdvancedSettings, MATheme, Palette } from './types';

// Color utility functions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const expanded = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const bigint = parseInt(expanded, 16)

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

function lighten(hex: string, amount = 0.1): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  )
}

function darken(hex: string, amount = 0.1): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

// Palette definitions for advanced customization
const PALETTES: Record<Palette, {
  name: string
  accent: string
  accentHover: string
  success: string
  warning: string
  danger: string
}> = {
  neutral: {
    name: 'Neutral',
    accent: '#0969da',
    accentHover: '#0550ae',
    success: '#1a7f37',
    warning: '#bf8700',
    danger: '#cf222e',
  },
  navy: {
    name: 'Navy',
    accent: '#1f2937',
    accentHover: '#111827',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  },
  slate: {
    name: 'Slate',
    accent: '#475569',
    accentHover: '#334155',
    success: '#16a34a',
    warning: '#ca8a04',
    danger: '#dc2626',
  },
  emerald: {
    name: 'Emerald',
    accent: '#059669',
    accentHover: '#047857',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  burgundy: {
    name: 'Burgundy',
    accent: '#991b1b',
    accentHover: '#7f1d1d',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  monochrome: {
    name: 'Monochrome',
    accent: '#8b949e',      // Light enough for dark backgrounds
    accentHover: '#7d8590', // Slightly darker hover
    success: '#8b949e',     // Consistent grayscale
    warning: '#a1a8b0',     // Slightly lighter for visibility
    danger: '#9ca3af',      // Lighter for contrast
  }
}

export function applyAdvancedSettings(baseTheme: MATheme, settings: AdvancedSettings): MATheme {
  let theme = { ...baseTheme }

  // Apply palette
  if (settings.palette !== 'neutral') {
    const palette = PALETTES[settings.palette]
    theme = {
      ...theme,
      accent: palette.accent,
      accentHover: palette.accentHover,
      success: palette.success,
      warning: palette.warning,
      danger: palette.danger,
    }
  }

  // Apply density
  const densityFactor = settings.density === 'compact' ? 0.8 :
    settings.density === 'presentation' ? 1.3 : 1.0

  const toNum = (px: string) => parseFloat(px.replace('px', '')) || 0
  const toPx = (n: number) => `${Math.round(n)}px`

  theme.spacing = {
    xs: toPx(toNum(theme.spacing.xs) * densityFactor),
    sm: toPx(toNum(theme.spacing.sm) * densityFactor),
    md: toPx(toNum(theme.spacing.md) * densityFactor),
    lg: toPx(toNum(theme.spacing.lg) * densityFactor),
    xl: toPx(toNum(theme.spacing.xl) * densityFactor),
  }

  theme.fontSize = {
    xs: toPx(toNum(theme.fontSize.xs) * Math.min(densityFactor * 1.1, 1.2)),
    sm: toPx(toNum(theme.fontSize.sm) * Math.min(densityFactor * 1.1, 1.2)),
    base: toPx(toNum(theme.fontSize.base) * Math.min(densityFactor * 1.1, 1.2)),
    lg: toPx(toNum(theme.fontSize.lg) * Math.min(densityFactor * 1.1, 1.2)),
    xl: toPx(toNum(theme.fontSize.xl) * Math.min(densityFactor * 1.1, 1.2)),
  }

  // Apply separation style
  if (settings.separation === 'subtle') {
    theme.border = lighten(theme.border, 0.15)
    theme.shadow = { sm: 'none', md: 'none', lg: theme.shadow.lg }
  } else if (settings.separation === 'clear') {
    theme.border = darken(theme.border, 0.1)
    // Keep existing shadows for clear separation
  }

  // Apply corner style
  const cornerMultiplier = settings.corners === 'subtle' ? 0.5 :
    settings.corners === 'rounded' ? 1.5 : 1.0

  theme.radius = {
    sm: toPx(toNum(theme.radius.sm) * cornerMultiplier),
    md: toPx(toNum(theme.radius.md) * cornerMultiplier),
    lg: toPx(toNum(theme.radius.lg) * cornerMultiplier),
  }

  // Apply emphasis toggles (this affects the emphasis colors visibility)
  if (!settings.emphasis.owners) {
    theme.emphasis.owner = theme.textSecondary
  }
  if (!settings.emphasis.deadlines) {
    theme.emphasis.deadline = theme.textSecondary
  }
  if (!settings.emphasis.riskFlags) {
    theme.emphasis.riskFlag = theme.textSecondary
  }


  return theme
}



export { PALETTES };

