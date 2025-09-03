import { useState } from 'react'
import { useAppearance } from '../appearance'
import type { ApiResponse } from '../types/api'
import { useToast } from '../ui/useToast'
import { useApi } from '../useApi'

interface BoardSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    boardId: string
    currentTitle: string
    currentDescription: string | null
    onBoardUpdated: (title: string, description: string | null) => void
}

export function BoardSettingsModal({
    isOpen,
    onClose,
    boardId,
    currentTitle,
    currentDescription,
    onBoardUpdated
}: BoardSettingsModalProps) {
    const { theme } = useAppearance()
    const { apiFetch } = useApi()
    const { success: toastSuccess, error: toastError } = useToast()

    const [title, setTitle] = useState(currentTitle)
    const [description, setDescription] = useState(currentDescription || '')
    const [isUpdating, setIsUpdating] = useState(false)

    const handleSave = async () => {
        if (!title.trim()) {
            toastError('Board title cannot be empty')
            return
        }

        setIsUpdating(true)
        try {
            const response = await apiFetch(`/api/boards/${boardId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null
                })
            })

            const result: ApiResponse<any> = await response.json()

            if (result.success) {
                onBoardUpdated(title.trim(), description.trim() || null)
                toastSuccess('Board settings updated successfully')
                onClose()
            } else {
                throw new Error(result.error || 'Failed to update board')
            }
        } catch (err) {
            console.error('Failed to update board:', err)
            toastError('Failed to update board settings')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleCancel = () => {
        setTitle(currentTitle)
        setDescription(currentDescription || '')
        onClose()
    }

    if (!isOpen) return null

    const modalStyle = {
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
        padding: theme.spacing?.lg || '24px'
    }

    const contentStyle = {
        backgroundColor: theme.surface,
        borderRadius: theme.radius?.lg || '12px',
        padding: theme.spacing?.xl || '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto' as const,
        boxShadow: theme.shadow?.lg || '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${theme.border}`
    }

    const headerStyle = {
        marginBottom: theme.spacing?.lg || '24px',
        textAlign: 'center' as const
    }

    const titleStyle = {
        fontSize: '24px',
        fontWeight: '700',
        color: theme.textPrimary,
        margin: 0,
        marginBottom: theme.spacing?.xs || '8px'
    }

    const subtitleStyle = {
        fontSize: '14px',
        color: theme.textSecondary,
        margin: 0
    }

    const formGroupStyle = {
        marginBottom: theme.spacing?.lg || '24px'
    }

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: theme.spacing?.sm || '12px'
    }

    const inputStyle = {
        width: '100%',
        padding: theme.spacing?.md || '16px',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius?.md || '8px',
        backgroundColor: theme.inputBg,
        color: theme.textPrimary,
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box' as const
    }

    const textareaStyle = {
        ...inputStyle,
        minHeight: '100px',
        resize: 'vertical' as const
    }

    const buttonGroupStyle = {
        display: 'flex',
        gap: theme.spacing?.md || '16px',
        justifyContent: 'flex-end'
    }

    const buttonStyle = {
        padding: `${theme.spacing?.md || '16px'} ${theme.spacing?.lg || '24px'}`,
        border: 'none',
        borderRadius: theme.radius?.md || '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    }

    const cancelButtonStyle = {
        ...buttonStyle,
        backgroundColor: 'transparent',
        color: theme.textSecondary,
        border: `1px solid ${theme.border}`
    }

    const saveButtonStyle = {
        ...buttonStyle,
        backgroundColor: theme.accent,
        color: theme.accentText
    }

    return (
        <div style={modalStyle} onClick={onClose}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Board Settings</h2>
                    <p style={subtitleStyle}>Configure your board settings</p>
                </div>

                <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="board-title">
                        Board Title *
                    </label>
                    <input
                        id="board-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={inputStyle}
                        placeholder="Enter board title"
                        disabled={isUpdating}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = theme.accent || '#007AFF'
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = theme.border || '#e1e8ed'
                        }}
                    />
                </div>

                <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="board-description">
                        Description
                    </label>
                    <textarea
                        id="board-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={textareaStyle}
                        placeholder="Enter board description (optional)"
                        disabled={isUpdating}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = theme.accent || '#007AFF'
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = theme.border || '#e1e8ed'
                        }}
                    />
                </div>

                <div style={buttonGroupStyle}>
                    <button
                        style={cancelButtonStyle}
                        onClick={handleCancel}
                        disabled={isUpdating}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        style={saveButtonStyle}
                        onClick={handleSave}
                        disabled={isUpdating || !title.trim()}
                        onMouseEnter={(e) => {
                            if (!isUpdating && title.trim()) {
                                e.currentTarget.style.backgroundColor = theme.accentHover || '#0056CC'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isUpdating && title.trim()) {
                                e.currentTarget.style.backgroundColor = theme.accent || '#007AFF'
                            }
                        }}
                    >
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
