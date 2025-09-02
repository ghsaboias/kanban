import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTheme } from '../theme/useTheme'

type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  show: (message: string, type?: ToastType, durationMs?: number) => void
  success: (message: string, durationMs?: number) => void
  error: (message: string, durationMs?: number) => void
  info: (message: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeouts = useRef<Record<string, number>>({})

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id])
      delete timeouts.current[id]
    }
  }, [])

  const showBase = useCallback((message: string, type: ToastType = 'info', durationMs = 3000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    // Auto dismiss
    timeouts.current[id] = window.setTimeout(() => remove(id), durationMs)
  }, [remove])

  const value = useMemo<ToastContextValue>(() => ({
    show: showBase,
    success: (m, d) => showBase(m, 'success', d),
    error: (m, d) => showBase(m, 'error', d),
    info: (m, d) => showBase(m, 'info', d),
  }), [showBase])

  const containerStyle = {
    position: 'fixed' as const,
    right: '16px',
    bottom: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    zIndex: 2000
  }

  const cardStyle = (type: ToastType) => ({
    minWidth: '220px',
    maxWidth: '360px',
    backgroundColor: type === 'error' ? (theme.danger || '#dc3545')
      : type === 'success' ? (theme.success || '#28a745')
        : theme.brand || theme.accent,
    color: theme.accentText,
    padding: '10px 12px',
    borderRadius: theme.radius?.sm || '6px',
    boxShadow: theme.shadow?.md || '0 2px 8px rgba(0,0,0,0.15)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
  })

  const closeBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: theme.accentText,
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={containerStyle}>
        {toasts.map(t => (
          <div key={t.id} style={cardStyle(t.type)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span aria-hidden>
                {t.type === 'success' ? '✔️' : t.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
              <span>{t.message}</span>
            </div>
            <button aria-label="Dismiss" onClick={() => remove(t.id)} style={closeBtnStyle}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

