import { useState } from 'react'
import { useAppearance } from '../appearance'

export type ExportOptions = {
  exportJson: boolean
  exportCardsCsv: boolean
  exportColumnsCsv: boolean
  honorFilters: boolean
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: ExportOptions) => void
  defaultHonorFilters?: boolean
}

export function ExportModal({ isOpen, onClose, onConfirm, defaultHonorFilters = true }: ExportModalProps) {
  const { theme } = useAppearance()
  const [exportJson, setExportJson] = useState(true)
  const [exportCardsCsv, setExportCardsCsv] = useState(false)
  const [exportColumnsCsv, setExportColumnsCsv] = useState(false)
  const [honorFilters, setHonorFilters] = useState(defaultHonorFilters)

  if (!isOpen) return null

  const hasSelection = exportJson || exportCardsCsv || exportColumnsCsv

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
    zIndex: 1000
  }

  const modalStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.lg || '12px',
    padding: theme.spacing?.lg || '20px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)'
  }

  const sectionStyle = {
    marginBottom: theme.spacing?.md || '16px'
  }

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.sm || '10px',
    margin: `${theme.spacing?.sm || '8px'} 0`
  }

  const labelStyle = {
    color: theme.textSecondary,
    fontSize: '14px'
  }

  const buttonStyle = {
    padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '16px'}`,
    borderRadius: theme.radius?.sm || '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none'
  } as const

  return (
    <div style={modalBackdropStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing?.md || '16px', color: theme.textPrimary }}>Export Board</h2>

        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: theme.spacing?.xs || '6px', fontWeight: 600 }}>What to export</div>
          <div style={rowStyle}>
            <input id="export-json" type="checkbox" checked={exportJson} onChange={(e) => setExportJson(e.target.checked)} />
            <label htmlFor="export-json" style={labelStyle}>Full board (JSON)</label>
          </div>
          <div style={rowStyle}>
            <input id="export-cards" type="checkbox" checked={exportCardsCsv} onChange={(e) => setExportCardsCsv(e.target.checked)} />
            <label htmlFor="export-cards" style={labelStyle}>Cards report (CSV)</label>
          </div>
          <div style={rowStyle}>
            <input id="export-columns" type="checkbox" checked={exportColumnsCsv} onChange={(e) => setExportColumnsCsv(e.target.checked)} />
            <label htmlFor="export-columns" style={labelStyle}>Columns report (CSV)</label>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: theme.spacing?.xs || '6px', fontWeight: 600 }}>Scope</div>
          <div style={rowStyle}>
            <input id="honor-filters" type="checkbox" checked={honorFilters} onChange={(e) => setHonorFilters(e.target.checked)} />
            <label htmlFor="honor-filters" style={labelStyle}>Honor current search/filter/sort</label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing?.sm || '8px' }}>
          <button
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: theme.muted,
              color: theme.accentText
            }}
          >
            Cancel
          </button>
          <button
            disabled={!hasSelection}
            onClick={() => onConfirm({ exportJson, exportCardsCsv, exportColumnsCsv, honorFilters })}
            style={{
              ...buttonStyle,
              backgroundColor: hasSelection ? theme.accent : theme.muted,
              color: theme.accentText,
              opacity: hasSelection ? 1 : 0.7,
              cursor: hasSelection ? 'pointer' : 'not-allowed'
            }}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
