import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { useUI } from '../ui/UIProvider'

export function UISwitcher() {
  const { theme } = useTheme()
  const { profile, profiles, setProfileKey } = useUI()
  const [open, setOpen] = useState(false)

  // Hotkey Alt+U to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 'u') setOpen(o => !o) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items = useMemo(() => profiles, [profiles])

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 76, zIndex: 9999 }}>
      {!open && (
        <button
          aria-label="Open UI switcher"
          onClick={() => setOpen(true)}
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: theme.shadow?.md || '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer'
          }}
        >
          🧩 UI
        </button>
      )}
      {open && (
        <div style={{
          width: 320,
          maxHeight: '60vh',
          overflow: 'auto',
          backgroundColor: theme.surface,
          color: theme.textPrimary,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          boxShadow: theme.shadow?.lg || '0 12px 32px rgba(0,0,0,0.2)',
          padding: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>UI Profiles</strong>
            <button onClick={() => setOpen(false)} style={{
              background: 'transparent',
              color: theme.textMuted,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer'
            }}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {items.map(p => (
              <div key={p.key} style={{
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                borderRadius: 8,
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
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}>{p.key === profile.key ? 'Applied' : 'Apply'}</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Alt+U toggles UI panel</div>
          </div>
        </div>
      )}
    </div>
  )
}

