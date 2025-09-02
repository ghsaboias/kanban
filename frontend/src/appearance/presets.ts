import type { MATheme, MAPreset } from './types'

// Base themes optimized for M&A work
export const baseLight: MATheme = {
  name: 'Light (M&A)',
  key: 'light-ma',
  
  // High contrast, clean surfaces
  background: '#fafbfc',
  surface: '#ffffff',
  surfaceAlt: '#f6f8fa',
  card: '#ffffff',
  border: '#d0d7de',
  
  // Clear text hierarchy
  textPrimary: '#1c2128',
  textSecondary: '#656d76',
  textMuted: '#8c959f',
  
  // Professional blue accent
  accent: '#0969da',
  accentHover: '#0550ae',
  accentText: '#ffffff',
  
  // Legacy compatibility
  muted: '#8c959f',
  inputBg: '#f6f8fa',
  overlay: 'rgba(0,0,0,0.10)',
  brand: '#222f44',
  action: '#0969da',
  link: '#0969da',
  focus: '#0969da',
  
  // Clear status indicators
  success: '#1a7f37',
  warning: '#bf8700',
  danger: '#cf222e',
  info: '#0969da',
  
  // M&A priority system
  priority: {
    critical: '#cf222e',
    HIGH: '#fd7e14',  // Legacy compatibility
    high: '#fd7e14',
    MEDIUM: '#bf8700',  // Legacy compatibility
    medium: '#bf8700',
    LOW: '#1a7f37',  // Legacy compatibility
    low: '#1a7f37',
  },
  
  // Risk assessment colors
  risk: {
    high: '#cf222e',
    medium: '#fd7e14', 
    low: '#1a7f37',
  },
  
  // Deal status indicators
  status: {
    active: '#0969da',
    pending: '#bf8700',
    complete: '#1a7f37',
    blocked: '#cf222e',
  },
  
  // Minimal layout for data density
  radius: { sm: '3px', md: '6px', lg: '8px' },
  shadow: { 
    sm: '0 1px 2px rgba(0,0,0,0.05)', 
    md: '0 1px 3px rgba(0,0,0,0.08)', 
    lg: '0 2px 6px rgba(0,0,0,0.10)' 
  },
  spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  
  // Professional typography
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
  },
  
  // M&A field emphasis
  emphasis: {
    owner: '#0969da',
    deadline: '#cf222e',
    attachment: '#8250df',
    riskFlag: '#fd7e14',
  }
}

export const baseDark: MATheme = {
  ...baseLight,
  name: 'Dark (M&A)',
  key: 'dark-ma',
  
  // Dark professional surfaces
  background: '#0d1117',
  surface: '#161b22',
  surfaceAlt: '#21262d',
  card: '#21262d',
  border: '#30363d',
  
  // Dark text hierarchy - WCAG AA compliant
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',  // Lightened from #7d8590 for better contrast
  textMuted: '#8b949e',      // Lightened to match secondary for consistent contrast
  
  // Accessible dark accent
  accent: '#58a6ff',
  accentHover: '#388bfd',
  accentText: '#0d1117',
  
  // Legacy compatibility (dark)
  muted: '#8b949e',
  inputBg: '#21262d',
  overlay: 'rgba(0,0,0,0.25)',
  brand: '#222f44',
  action: '#58a6ff',
  link: '#58a6ff',
  focus: '#58a6ff',
  
  // Dark status indicators
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  info: '#58a6ff',
  
  priority: {
    critical: '#f85149',
    HIGH: '#fb8500',  // Legacy compatibility
    high: '#fb8500',
    MEDIUM: '#d29922',  // Legacy compatibility
    medium: '#d29922',
    LOW: '#3fb950',  // Legacy compatibility
    low: '#3fb950',
  },
  
  risk: {
    high: '#f85149',
    medium: '#fb8500',
    low: '#3fb950',
  },
  
  status: {
    active: '#58a6ff',
    pending: '#d29922',
    complete: '#3fb950',
    blocked: '#f85149',
  },
  
  emphasis: {
    owner: '#58a6ff',
    deadline: '#f85149',
    attachment: '#a5a5ff',
    riskFlag: '#fb8500',
  }
}

// M&A-specific preset configurations
export const MA_PRESETS: Record<MAPreset, {
  name: string
  description: string
  baseTheme: 'light' | 'dark'
  modifications: Partial<MATheme>
}> = {
  'pipeline-review': {
    name: 'Pipeline Review',
    description: 'Extra-dense layout for deal pipeline overviews',
    baseTheme: 'light',
    modifications: {
      spacing: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
      fontSize: {
        xs: '10px',
        sm: '11px', 
        base: '12px',
        lg: '14px',
        xl: '16px',
      },
      shadow: { sm: 'none', md: 'none', lg: '0 1px 2px rgba(0,0,0,0.05)' },
    }
  },
  
  'diligence-tracker': {
    name: 'Diligence Tracker', 
    description: 'Checklist emphasis with clear status indicators',
    baseTheme: 'light',
    modifications: {
      // Stronger borders for checklist clarity
      border: '#afb8c1',
      // Enhanced status colors
      status: {
        active: '#0969da',
        pending: '#bf8700', 
        complete: '#1a7f37',
        blocked: '#cf222e',
      },
      emphasis: {
        owner: '#0969da',
        deadline: '#cf222e',
        attachment: '#8250df',
        riskFlag: '#fd7e14',
      }
    }
  },
  
  'ic-presentation': {
    name: 'IC Presentation',
    description: 'Spacious layout optimized for presentations and exports',
    baseTheme: 'light',
    modifications: {
      spacing: { xs: '6px', sm: '12px', md: '18px', lg: '24px', xl: '36px' },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px', 
        lg: '18px',
        xl: '22px',
      },
      shadow: { 
        sm: '0 1px 3px rgba(0,0,0,0.08)', 
        md: '0 2px 8px rgba(0,0,0,0.12)', 
        lg: '0 4px 20px rgba(0,0,0,0.15)' 
      },
    }
  },
  
  'night-work': {
    name: 'Night Work',
    description: 'Eye-strain optimized dark theme for late hours',
    baseTheme: 'dark',
    modifications: {
      // Warmer, softer dark theme
      background: '#1a1f24',
      surface: '#242a30',
      card: '#2d343b',
      
      // Reduced contrast for comfort
      textPrimary: '#d0d7de',
      textSecondary: '#8b949e',
      
      // Warmer accents
      accent: '#79c0ff',
      accentHover: '#58a6ff',
    }
  },
  
  'redline-legal': {
    name: 'Redline/Legal',
    description: 'High contrast for document review and legal analysis',
    baseTheme: 'light',
    modifications: {
      // Ultra-high contrast
      textPrimary: '#000000',
      border: '#666d76',
      
      // Legal status colors
      danger: '#d1242f', // Red for issues
      warning: '#fb8500', // Orange for review needed
      success: '#2da44e', // Green for approved
      
      // Strong emphasis colors
      emphasis: {
        owner: '#0969da',
        deadline: '#d1242f',
        attachment: '#8250df',
        riskFlag: '#fb8500',
      }
    }
  },
  
  'deal-room-readout': {
    name: 'Deal Room Readout',
    description: 'Clean layout for deal room presentations and exports',
    baseTheme: 'light',
    modifications: {
      // Minimal chrome
      border: '#d8dee4',
      shadow: { sm: 'none', md: 'none', lg: '0 1px 2px rgba(0,0,0,0.05)' },
      
      // Watermark-safe neutral palette
      background: '#ffffff',
      surface: '#f6f8fa', 
      
      // Professional color scheme
      accent: '#24292f',
      textSecondary: '#57606a',
    }
  },
  
  'analytics-view': {
    name: 'Analytics View',
    description: 'Data-dense layout with numeric emphasis',
    baseTheme: 'light',
    modifications: {
      // Compact for data density
      spacing: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
      
      // Monospace-friendly
      fontSize: {
        xs: '10px',
        sm: '11px',
        base: '13px',
        lg: '15px', 
        xl: '17px',
      },
      
      // High contrast for numbers
      textPrimary: '#1c2128',
      border: '#afb8c1',
    }
  }
}

export function createMAPreset(presetKey: MAPreset): MATheme {
  const preset = MA_PRESETS[presetKey]
  const baseTheme = preset.baseTheme === 'dark' ? baseDark : baseLight
  
  return {
    ...baseTheme,
    name: preset.name,
    key: presetKey,
    ...preset.modifications,
  }
}