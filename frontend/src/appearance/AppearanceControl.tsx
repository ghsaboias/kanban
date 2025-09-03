import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdvancedSettings, BaseMode } from './types'
import { useAppearance } from './useAppearance'
import { PALETTES } from './utils'

interface ControlsProps {
  disabled?: boolean
}

function SimpleControls({ disabled }: ControlsProps) {
  const { config, setMode } = useAppearance()

  const modes: { key: BaseMode; label: string; description: string }[] = [
    { key: 'light', label: 'Light', description: 'Clean light theme' },
    { key: 'dark', label: 'Dark', description: 'Professional dark theme' },
    { key: 'auto', label: 'Auto', description: 'Match system preference' },
  ]

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
        Base Theme
      </div>
      {modes.map(mode => (
        <label key={mode.key} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: config.mode === mode.key ? 'var(--color-accent)' : 'transparent',
          color: config.mode === mode.key ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
        }}>
          <input
            type="radio"
            name="mode"
            value={mode.key}
            checked={config.mode === mode.key}
            onChange={() => setMode(mode.key)}
            disabled={disabled}
            style={{ margin: 0 }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{mode.label}</div>
            <div style={{
              fontSize: '12px',
              color: config.mode === mode.key ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
            }}>
              {mode.description}
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}



function AdvancedControls({ disabled }: ControlsProps) {
  const { config, setAdvanced } = useAppearance()
  const advanced = config.advanced!

  const updateAdvanced = (updates: Partial<AdvancedSettings>) => {
    setAdvanced({ ...advanced, ...updates })
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600 }}>
        Advanced Customization
      </div>

      {/* Palette */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          Color Palette
        </div>
        <select
          value={advanced.palette}
          onChange={(e) => updateAdvanced({ palette: e.target.value as typeof advanced.palette })}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {Object.entries(PALETTES).map(([key, palette]) => (
            <option key={key} value={key}>{palette.name}</option>
          ))}
        </select>
      </div>

      {/* Density */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          Layout Density
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          {(['compact', 'comfortable', 'presentation'] as const).map(density => (
            <button
              key={density}
              onClick={() => updateAdvanced({ density })}
              disabled={disabled}
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: advanced.density === density ? 'var(--color-accent)' : 'var(--color-surface)',
                color: advanced.density === density ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {density === 'compact' ? 'Compact' :
                density === 'comfortable' ? 'Comfortable' : 'Presentation'}
            </button>
          ))}
        </div>
      </div>

      {/* Separation */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          Visual Separation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {(['subtle', 'clear'] as const).map(separation => (
            <button
              key={separation}
              onClick={() => updateAdvanced({ separation })}
              disabled={disabled}
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: advanced.separation === separation ? 'var(--color-accent)' : 'var(--color-surface)',
                color: advanced.separation === separation ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {separation === 'subtle' ? 'Subtle' : 'Clear'}
            </button>
          ))}
        </div>
      </div>

      {/* Corner Style */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
          Corner Style
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          {(['subtle', 'standard', 'rounded'] as const).map(corners => (
            <button
              key={corners}
              onClick={() => updateAdvanced({ corners })}
              disabled={disabled}
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border)',
                borderRadius: corners === 'subtle' ? '2px' : corners === 'rounded' ? '8px' : '4px',
                backgroundColor: advanced.corners === corners ? 'var(--color-accent)' : 'var(--color-surface)',
                color: advanced.corners === corners ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {corners === 'subtle' ? 'Subtle' :
                corners === 'standard' ? 'Standard' : 'Rounded'}
            </button>
          ))}
        </div>
      </div>

      {/* Emphasis Toggles */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
          Field Emphasis
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          {([
            { key: 'owners' as const, label: 'Owner Names' },
            { key: 'deadlines' as const, label: 'Deadlines' },
            { key: 'riskFlags' as const, label: 'Risk Flags' },
          ]).map(({ key, label }) => (
            <label key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              <input
                type="checkbox"
                checked={advanced.emphasis[key]}
                onChange={(e) => updateAdvanced({
                  emphasis: { ...advanced.emphasis, [key]: e.target.checked }
                })}
                disabled={disabled}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// Mini board preview component  
function MiniBoard() {
  const { theme, config } = useAppearance()

  type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
  type Card = {
    id: string
    title: string
    priority: Priority
    owner?: string
    deadline?: string
    risk?: Priority
  }
  type Column = { id: string; title: string; cards: Card[] }

  const mockColumns: Column[] = [
    {
      id: '1',
      title: 'To Do',
      cards: [
        {
          id: '1',
          title: 'Due Diligence Review',
          priority: 'HIGH',
          deadline: '2025-09-05',
          owner: 'Smith',
          risk: 'HIGH'
        },
        {
          id: '2',
          title: 'Contract Analysis',
          priority: 'MEDIUM'
        },
      ]
    },
    {
      id: '2',
      title: 'In Progress',
      cards: [
        {
          id: '3',
          title: 'Financial Audit',
          priority: 'HIGH',
          owner: 'Johnson',
          deadline: '2025-09-10'
        },
      ]
    },
    {
      id: '3',
      title: 'Done',
      cards: [
        {
          id: '4',
          title: 'Initial Assessment',
          priority: 'LOW',

        },
      ]
    }
  ]

  // Force re-render when theme changes by using config as a dependency
  const themeKey = `${config.mode}-${JSON.stringify(config.advanced)}`

  // Helper function to get priority color with fallback
  const getPriorityColor = (priority: Priority) => {
    const colors = theme.priority
    switch (priority) {
      case 'HIGH':
        return colors.high || colors.HIGH || colors.high || '#fd7e14'
      case 'MEDIUM':
        return colors.medium || colors.MEDIUM || colors.medium || '#bf8700'
      case 'LOW':
        return colors.low || colors.LOW || colors.low || '#1a7f37'
      default:
        return colors.low || colors.LOW || '#1a7f37'
    }
  }

  return (
    <div key={themeKey} style={{
      width: '300px',
      height: '200px',
      backgroundColor: theme.background,
      border: `1px solid ${theme.border}`,
      borderRadius: theme.radius.md,
      padding: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: theme.textSecondary,
        marginBottom: '8px'
      }}>
        Live Preview
      </div>
      <div style={{ display: 'flex', gap: '8px', height: '160px' }}>
        {mockColumns.map(column => (
          <div key={column.id} style={{
            flex: 1,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.sm,
            padding: '6px',
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 500,
              color: theme.textPrimary,
              marginBottom: '4px',
              textAlign: 'center'
            }}>
              {column.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {column.cards.map(card => (
                <div key={card.id} style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius.sm,
                  padding: '4px',
                  fontSize: '8px',
                  color: theme.textPrimary,
                  borderLeft: `3px solid ${getPriorityColor(card.priority)}`,
                }}>
                  <div>{card.title}</div>
                  {/* M&A Fields Preview */}
                  {(card.owner || card.deadline || card.risk) && (
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                      marginTop: '2px',
                      flexWrap: 'wrap',
                      fontSize: '6px'
                    }}>
                      {card.owner && (
                        <span style={{
                          color: theme.emphasis?.owner || theme.textSecondary,
                          backgroundColor: theme.surfaceAlt + '50',
                          padding: '1px 2px',
                          borderRadius: '1px'
                        }}>
                          👤 {card.owner}
                        </span>
                      )}
                      {card.deadline && (
                        <span style={{
                          color: theme.emphasis?.deadline || theme.danger,
                          backgroundColor: theme.danger + '10',
                          padding: '1px 2px',
                          borderRadius: '1px'
                        }}>
                          📅 3d
                        </span>
                      )}
                      {card.risk && (
                        <span style={{
                          color: theme.emphasis?.riskFlag || theme.danger,
                          backgroundColor: theme.danger + '10',
                          padding: '1px 2px',
                          borderRadius: '1px'
                        }}>
                          ⚠️
                        </span>
                      )}

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppearanceControl() {
  const { theme, resetToDefaults, locked } = useAppearance()
  const [open, setOpen] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple')
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const lastFocusableRef = useRef<HTMLButtonElement>(null)

  // Close modal handler
  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setOpen(prev => !prev)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  // Focus trap effect
  useEffect(() => {
    if (!open || !dialogRef.current) return

    const dialog = dialogRef.current
    const focusableElements = dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus first element on open
    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    dialog.addEventListener('keydown', handleTabKey)
    return () => dialog.removeEventListener('keydown', handleTabKey)
  }, [open])

  // Overlay click handler
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  if (!open) {
    return (
      <div style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 500 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.md,
            padding: '10px 14px',
            cursor: 'pointer',
            boxShadow: theme.shadow.md,
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          🎨 Appearance {locked && '🔒'}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
        }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          zIndex: 999,
          display: 'flex',
          gap: '16px',
        }}
      >
        {/* Live Preview */}
        {!previewCollapsed && (
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadow.lg,
            padding: '16px',
          }}>
            <MiniBoard />
          </div>
        )}

        {/* Main Panel */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="appearance-title"
          style={{
            width: '400px',
            maxHeight: '80vh',
            overflow: 'auto',
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadow.lg,
            padding: '16px',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 id="appearance-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Appearance Settings {locked && '🔒'}
            </h3>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => setPreviewCollapsed(prev => !prev)}
                title={previewCollapsed ? 'Show preview' : 'Hide preview'}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius.sm,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: theme.textMuted,
                  fontSize: '12px',
                }}
              >
                {previewCollapsed ? '+' : '−'}
              </button>
              <button
                ref={firstFocusableRef}
                onClick={handleClose}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius.sm,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: theme.textMuted,
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lock Notice */}
          {locked && (
            <div style={{
              backgroundColor: theme.warning + '20',
              border: `1px solid ${theme.warning}`,
              borderRadius: theme.radius.sm,
              padding: '8px 12px',
              marginBottom: '16px',
              fontSize: '12px',
              color: theme.textPrimary,
            }}>
              🔒 Appearance settings are locked by administrator
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '16px',
            borderBottom: `1px solid ${theme.border}`,
            paddingBottom: '8px',
          }}>
            {[
              { key: 'simple' as const, label: 'Simple' },
              { key: 'advanced' as const, label: 'Advanced' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                disabled={locked}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  backgroundColor: activeTab === tab.key ? theme.accent : 'transparent',
                  color: activeTab === tab.key ? theme.accentText : theme.textSecondary,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>


          {/* Content */}
          <div style={{ marginBottom: '16px' }}>
            {activeTab === 'simple' && <SimpleControls disabled={locked} />}
            {activeTab === 'advanced' && <AdvancedControls disabled={locked} />}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: `1px solid ${theme.border}`,
            fontSize: '11px',
            color: theme.textMuted,
          }}>
            <span>Alt+A toggles • ESC to close</span>
            <button
              ref={lastFocusableRef}
              onClick={resetToDefaults}
              disabled={locked}
              style={{
                padding: '4px 8px',
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.surface,
                color: theme.textSecondary,
                cursor: locked ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                opacity: locked ? 0.6 : 1,
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
