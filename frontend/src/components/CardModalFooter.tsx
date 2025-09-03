import { useAppearance } from '../appearance'

interface CardModalFooterProps {
    hasChanges: boolean
    loading: boolean
    title: string
    onCancel: () => void
    onSave: () => void
}

export function CardModalFooter({ hasChanges, loading, title, onCancel, onSave }: CardModalFooterProps) {
    const { theme } = useAppearance()

    if (!hasChanges) return null

    return (
        <div style={{
            padding: `${theme.spacing?.md || '16px'} ${theme.spacing?.lg || '20px'}`,
            borderTop: '1px solid #e1e1e1',
            display: 'flex',
            gap: theme.spacing?.sm || '12px',
            justifyContent: 'flex-end'
        }}>
            <button
                onClick={onCancel}
                style={{
                    padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.md || '16px'}`,
                    border: '1px solid #e1e1e1',
                    borderRadius: theme.radius?.sm || '6px',
                    backgroundColor: 'white',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px'
                }}
            >
                Cancel
            </button>
            <button
                onClick={onSave}
                disabled={loading || !title.trim()}
                style={{
                    padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.md || '16px'}`,
                    border: 'none',
                    borderRadius: theme.radius?.sm || '6px',
                    backgroundColor: loading ? '#999' : '#007bff',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                }}
            >
                {loading ? 'Saving...' : 'Save'}
            </button>
        </div>
    )
}
