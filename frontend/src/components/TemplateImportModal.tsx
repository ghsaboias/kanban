import { useMemo, useState } from 'react';
import { useTheme } from '../theme/useTheme';
import { useApi } from '../useApi';

type ExistingColumn = { id: string; title: string; position: number; cardCount: number }

interface TemplateImportModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  existingColumns: ExistingColumn[]
  onAfterApply?: () => Promise<void> | void
}

type Template = {
  key: string
  name: string
  description?: string
  columns: string[]
}

export function TemplateImportModal({ isOpen, onClose, boardId, existingColumns, onAfterApply }: TemplateImportModalProps) {
  const { theme } = useTheme()
  const { apiFetch } = useApi()
  const [selectedKey, setSelectedKey] = useState<string>('ma-pipeline')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ total: number; done: number }>({ total: 0, done: 0 })
  // Keep UI simple: we always skip existing titles when adding
  const skipExisting = true

  const templates = useMemo<Template[]>(() => ([
    {
      key: 'ma-pipeline',
      name: 'M&A Pipeline',
      description: 'Sourcing → NDA → CIM → MGMT → IOI → LOI → Diligence → IC → SPA → Closing',
      columns: [
        'Sourcing',
        'NDA/Teaser',
        'CIM',
        'Management Calls',
        'IOI',
        'LOI',
        'Diligence',
        'Investment Committee',
        'SPA/Negotiation',
        'Closing',
      ],
    },
  ]), [])

  if (!isOpen) return null

  const modalBackdropStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }

  const modalStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.lg || '12px',
    padding: '20px',
    width: '92%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)'
  }

  const handleImport = async (mode: 'add' | 'replace') => {
    if (!boardId) return
    const template = templates.find(t => t.key === selectedKey)
    if (!template) return

    const existingTitles = new Set(existingColumns.map(c => c.title.trim().toLowerCase()))
    const toCreate = (mode === 'add' && skipExisting)
      ? template.columns.filter(name => !existingTitles.has(name.trim().toLowerCase()))
      : template.columns

    setIsSubmitting(true)

    try {
      if (mode === 'replace') {
        // First pass: delete empty columns, rename non-empty with prefix 'Old - '
        const columnsOps = existingColumns.length
        let done = 0
        setProgress({ total: columnsOps + toCreate.length, done })
        for (const col of existingColumns) {
          try {
            if (col.cardCount === 0) {
              await apiFetch(`/api/columns/${col.id}`, { method: 'DELETE' })
            } else {
              const prefixed = col.title.startsWith('Old - ') ? col.title : `Old - ${col.title}`
              await apiFetch(`/api/columns/${col.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: prefixed })
              })
            }
          } catch {
            // Best-effort; continue
            console.warn('Replace op failed for column', col.id)
          } finally {
            done += 1
            setProgress({ total: columnsOps + toCreate.length, done })
          }
        }

        // Now create new pipeline columns
        for (let i = 0; i < toCreate.length; i++) {
          const title = toCreate[i]
          try {
            const res = await apiFetch(`/api/boards/${boardId}/columns`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title })
            })
            try { await res.json() } catch { /* ignore */ }
          } catch {
            console.warn('Failed to create column from template', title)
          } finally {
            done += 1
            setProgress({ total: columnsOps + toCreate.length, done })
          }
        }
      } else {
        // Add mode: append columns (skipping existing titles)
        setProgress({ total: toCreate.length, done: 0 })
        for (let i = 0; i < toCreate.length; i++) {
          const title = toCreate[i]
          // Create sequentially to preserve order; server appends when no position is provided
          const res = await apiFetch(`/api/boards/${boardId}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
          })
          // Best-effort; ignore individual failures to continue the batch
          try { await res.json() } catch { /* ignore */ }
          setProgress({ total: toCreate.length, done: i + 1 })
        }
      }
      // Refresh board view for the initiator (socket broadcast excludes initiator)
      try { await onAfterApply?.() } catch { /* ignore */ }
      onClose()
    } catch (err) {
      console.error('Template import failed', err)
      // Keep modal open to let user retry or close
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 12px', color: theme.textPrimary, fontSize: '18px' }}>Import From Template</h2>

        {/* Simple choice: Keep or Replace */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={() => handleImport('add')}
            disabled={isSubmitting}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              background: isSubmitting ? theme.muted : theme.surfaceAlt,
              color: theme.textPrimary,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              flex: 1,
              fontWeight: 600
            }}
          >
            Keep Current Columns
          </button>
          <button
            onClick={() => handleImport('replace')}
            disabled={isSubmitting}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              background: isSubmitting ? theme.muted : (theme.danger || '#ea384c'),
              color: theme.accentText,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              flex: 1,
              fontWeight: 600
            }}
          >
            Replace Current Columns
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {templates.map(t => (
            <label key={t.key} style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '10px',
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              background: theme.surfaceAlt,
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                name="template"
                checked={selectedKey === t.key}
                onChange={() => setSelectedKey(t.key)}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: theme.textPrimary }}>{t.name}</div>
                {t.description && (
                  <div style={{ color: theme.textSecondary, fontSize: '13px', marginTop: '4px' }}>{t.description}</div>
                )}
                <div style={{ color: theme.textMuted, fontSize: '12px', marginTop: '6px' }}>
                  {t.columns.length} columns will be created
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* No additional options; add-mode implicitly skips existing titles */}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 12px',
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.textPrimary,
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <div style={{
            padding: '8px 12px',
            color: theme.textMuted,
            fontSize: '12px'
          }}>
            {isSubmitting ? `Processing ${progress.done}/${progress.total}…` : 'Choose an option above'}
          </div>
        </div>
      </div>
    </div>
  )
}
