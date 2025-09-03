import { useRef } from 'react'
import { useAppearance } from '../appearance'
import { TIMEOUTS } from '../constants/timeouts'

interface CardModalHeaderProps {
    title: string
    onTitleChange: (title: string) => void
    onClose: () => void
}

export function CardModalHeader({ title, onTitleChange, onClose }: CardModalHeaderProps) {
    const { theme } = useAppearance()
    const titleInputRef = useRef<HTMLInputElement>(null)

    // Focus title input when component mounts
    useRef(() => {
        setTimeout(() => titleInputRef.current?.focus(), TIMEOUTS.FOCUS_DELAY)
    })

    return (
        <div style={{
            padding: theme.spacing?.lg || '20px',
            borderBottom: '1px solid #e1e1e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#333',
                    background: 'transparent',
                    flex: 1,
                    marginRight: theme.spacing?.md || '16px',
                    minWidth: 0
                }}
                placeholder="Card title"
            />
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#666',
                    cursor: 'pointer',
                    padding: theme.spacing?.xs || '4px',
                    borderRadius: theme.radius?.sm || '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                }}
            >
                ×
            </button>
        </div>
    )
}
