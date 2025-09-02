import { useEffect, useMemo, useState } from 'react'
import { generateVariants, type Theme } from '../theme/themes'
import { useTheme } from '../theme/useTheme'
import { useUI } from '../ui/useUI'

function Swatch({ color, radius }: { color: string, radius: string }) {
  return <div style={{ width: 16, height: 16, borderRadius: radius, backgroundColor: color, border: '1px solid rgba(0,0,0,0.08)' }} />
}

function ThemePreview({ theme, radius }: { theme: Theme, radius: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Swatch color={theme.background} radius={radius} />
      <Swatch color={theme.surface} radius={radius} />
      <Swatch color={theme.card} radius={radius} />
      <Swatch color={theme.border} radius={radius} />
      <Swatch color={theme.accent} radius={radius} />
      <Swatch color={theme.textPrimary} radius={radius} />
    </div>
  )
}

export function StyleSwitcher() {
  const { theme, setTheme, available, persist, setPersist } = useTheme()
  const { profile, profiles, setProfileKey, custom, setCustom } = useUI()
  const [open, setOpen] = useState(true)
  const [activeView, setActiveView] = useState<'themes' | 'ui'>('themes')

  // Hotkey Alt+S to toggle panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 's') setOpen(o => !o) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const themesList = useMemo(() => Object.entries(available).map(([key, t]) => ({ key, t })), [available])
  const currentVariants = useMemo(() => generateVariants(theme), [theme])

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999 }}>
      {!open && (
        <button
          aria-label="Open style switcher"
          onClick={() => setOpen(true)}
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius?.md || '8px',
            padding: '8px 12px',
            boxShadow: theme.shadow?.md || '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer'
          }}
        >
          🎛️ Style
        </button>
      )}

      {open && (
        <div style={{
          width: 420,
          maxHeight: '70vh',
          overflow: 'auto',
          backgroundColor: theme.surface,
          color: theme.textPrimary,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius?.md || '10px',
          boxShadow: theme.shadow?.lg || '0 12px 32px rgba(0,0,0,0.2)',
          padding: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setActiveView('themes')}
                style={{
                  backgroundColor: activeView === 'themes' ? theme.accent : theme.surfaceAlt,
                  color: activeView === 'themes' ? theme.accentText : theme.textSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '6px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >Themes</button>
              <button
                onClick={() => setActiveView('ui')}
                style={{
                  backgroundColor: activeView === 'ui' ? theme.accent : theme.surfaceAlt,
                  color: activeView === 'ui' ? theme.accentText : theme.textSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '6px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >UI Profiles</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textMuted }}>
                <input type="checkbox" checked={persist} onChange={e => setPersist(e.target.checked)} />
                Persist theme
              </label>
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent',
                color: theme.textMuted,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.sm || '6px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}>Close</button>
            </div>
          </div>

          {activeView === 'themes' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 12 }}>
                {themesList.map(({ key, t }) => (
                  <div key={key} style={{
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.card,
                    borderRadius: theme.radius?.md || '8px',
                    padding: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>key: {t.key ?? key}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ThemePreview theme={t} radius={theme.radius?.sm || '6px'} />
                      <button onClick={() => setTheme(t)} style={{
                        backgroundColor: theme.accent,
                        color: theme.accentText,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius?.sm || '6px',
                        padding: '6px 8px',
                        cursor: 'pointer'
                      }}>Apply</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8, color: theme.textMuted, fontSize: 12 }}>Derived variants from current theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {currentVariants.map((v, idx) => (
                  <div key={idx} style={{
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.card,
                    borderRadius: theme.radius?.md || '8px',
                    padding: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.theme.name}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>{v.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ThemePreview theme={v.theme} radius={theme.radius?.sm || '6px'} />
                      <button onClick={() => setTheme(v.theme)} style={{
                        backgroundColor: theme.accent,
                        color: theme.accentText,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius?.sm || '6px',
                        padding: '6px 8px',
                        cursor: 'pointer'
                      }}>Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeView === 'ui' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {profiles.map(p => (
                <div key={p.key} style={{
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  borderRadius: theme.radius?.md || '8px',
                  padding: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 12, color: theme.textMuted }}>{p.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setProfileKey(p.key)} style={{
                      backgroundColor: p.key === profile.key ? theme.accent : theme.surfaceAlt,
                      color: p.key === profile.key ? theme.accentText : theme.textSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius?.sm || '6px',
                      padding: '6px 8px',
                      cursor: 'pointer'
                    }}>{p.key === profile.key ? 'Applied' : 'Apply'}</button>
                  </div>
                </div>
              ))}

              {/* Custom profile controls */}
              <div style={{
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                borderRadius: theme.radius?.md || '8px',
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Custom</strong>
                  <button onClick={() => setProfileKey('custom')} style={{
                    backgroundColor: profile.key === 'custom' ? theme.accent : theme.surfaceAlt,
                    color: profile.key === 'custom' ? theme.accentText : theme.textSecondary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '6px',
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}>{profile.key === 'custom' ? 'Applied' : 'Apply'}</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>Rounding</span>
                    <select value={custom.rounding} onChange={(e) => setCustom({ ...custom, rounding: e.target.value as 'sharp' | 'rounded' | 'soft' })} style={{
                      padding: '6px 8px', border: `1px solid ${theme.border}`, borderRadius: theme.radius?.sm || '6px', background: theme.surfaceAlt, color: theme.textPrimary
                    }}>
                      <option value="sharp">Sharp</option>
                      <option value="rounded">Rounded</option>
                      <option value="soft">Soft</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>Elevation</span>
                    <select value={custom.elevation} onChange={(e) => setCustom({ ...custom, elevation: e.target.value as 'flat' | 'elevated' })} style={{
                      padding: '6px 8px', border: `1px solid ${theme.border}`, borderRadius: theme.radius?.sm || '6px', background: theme.surfaceAlt, color: theme.textPrimary
                    }}>
                      <option value="flat">Flat</option>
                      <option value="elevated">Elevated</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>Density</span>
                    <select value={custom.density} onChange={(e) => setCustom({ ...custom, density: e.target.value as 'compact' | 'cozy' | 'comfortable' })} style={{
                      padding: '6px 8px', border: `1px solid ${theme.border}`, borderRadius: theme.radius?.sm || '6px', background: theme.surfaceAlt, color: theme.textPrimary
                    }}>
                      <option value="compact">Compact</option>
                      <option value="cozy">Cozy</option>
                      <option value="comfortable">Comfortable</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>Borders</span>
                    <select value={custom.borderStrength} onChange={(e) => setCustom({ ...custom, borderStrength: e.target.value as 'light' | 'normal' | 'strong' })} style={{
                      padding: '6px 8px', border: `1px solid ${theme.border}`, borderRadius: theme.radius?.sm || '6px', background: theme.surfaceAlt, color: theme.textPrimary
                    }}>
                      <option value="light">Light</option>
                      <option value="normal">Normal</option>
                      <option value="strong">Strong</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: theme.textMuted }}>Contrast</span>
                  <select value={custom.contrast} onChange={(e) => setCustom({ ...custom, contrast: e.target.value as 'low' | 'normal' | 'high' })} style={{
                    padding: '6px 8px', border: `1px solid ${theme.border}`, borderRadius: theme.radius?.sm || '6px', background: theme.surfaceAlt, color: theme.textPrimary, width: '50%'
                  }}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Alt+S toggles Style panel</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setTheme(available.light)} style={{
                backgroundColor: theme.surfaceAlt,
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.sm || '6px',
                padding: '6px 8px',
                cursor: 'pointer'
              }}>Reset Theme</button>
              <button onClick={() => setProfileKey('default')} style={{
                backgroundColor: theme.surfaceAlt,
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.sm || '6px',
                padding: '6px 8px',
                cursor: 'pointer'
              }}>Reset UI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
