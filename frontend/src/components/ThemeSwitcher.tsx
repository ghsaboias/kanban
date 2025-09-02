import { useEffect, useMemo, useState } from 'react'
import { THEMES, generateVariants, type Theme, type Variant } from '../theme/themes'
import { useTheme } from '../theme/useTheme'

type Level = {
  title: string
  base: Theme
  variants: Variant[]
}

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

export function ThemeSwitcher() {
  const { theme, setTheme, available, persist, setPersist } = useTheme()
  const [open, setOpen] = useState(true) // visible in UI by default
  const baseThemes = available

  const [stack, setStack] = useState<Level[]>([])

  // build top level variants if exploring
  const currentLevel = stack[stack.length - 1]

  const topTitle = currentLevel?.title ?? 'Base Themes'

  const baseList = useMemo(() => Object.entries(baseThemes).map(([key, t]) => ({ key, t })), [baseThemes])

  const variants = currentLevel?.variants

  // Hotkey to toggle panel visibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') setOpen(o => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999 }}>
      {!open && (
        <button
          aria-label="Open theme switcher"
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
          🎨 Themes
        </button>
      )}
      {open && (
        <div style={{
          width: 360,
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
            <strong>{topTitle}</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textMuted }}>
                <input type="checkbox" checked={persist} onChange={e => setPersist(e.target.checked)} />
                Persist selection
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

          {stack.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <button onClick={() => setStack(s => s.slice(0, -1))} style={{
                backgroundColor: theme.surfaceAlt,
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.sm || '6px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}>← Back</button>
            </div>
          )}

          {!variants && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {baseList.map(({ key, t }) => (
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
                    <button onClick={() => setStack(s => [...s, { title: `Explore: ${t.name}`, base: t, variants: generateVariants(t) }])} style={{
                      backgroundColor: theme.surfaceAlt,
                      color: theme.textSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius?.sm || '6px',
                      padding: '6px 8px',
                      cursor: 'pointer'
                    }}>Explore</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {variants && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {variants.map((v, idx) => (
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
                    <button onClick={() => setStack(s => [...s, { title: `Explore: ${v.theme.name}`, base: v.theme, variants: generateVariants(v.theme) }])} style={{
                      backgroundColor: theme.surfaceAlt,
                      color: theme.textSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius?.sm || '6px',
                      padding: '6px 8px',
                      cursor: 'pointer'
                    }}>Explore</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Alt+T toggles panel</div>
            <button onClick={() => setTheme(THEMES.light)} style={{
              backgroundColor: theme.surfaceAlt,
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radius?.sm || '6px',
              padding: '6px 8px',
              cursor: 'pointer'
            }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  )
}
