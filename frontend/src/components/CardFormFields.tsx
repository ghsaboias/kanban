
import { useAppearance } from '../appearance'
import { extractImages } from '../utils/html'
import { RichTextEditor } from './RichTextEditor'

interface User {
    id: string
    name: string
    email: string
}

interface CardFormFieldsProps {
    formData: {
        title: string
        description: string
        priority: 'LOW' | 'MEDIUM' | 'HIGH'
        assigneeId: string
        deadline: string
        riskLevel: string
        ownerId: string
    }
    users: User[]
    onFormDataChange: (field: string, value: string) => void
    onImageSelect: (src: string) => void
}

const priorityLabels = {
    HIGH: 'Alta',
    MEDIUM: 'Média',
    LOW: 'Baixa'
}

const priorityColors = {
    HIGH: '#ff6b6b',
    MEDIUM: '#ffd93d',
    LOW: '#6bcf7f'
}

export function CardFormFields({ formData, users, onFormDataChange, onImageSelect }: CardFormFieldsProps) {
    const { theme } = useAppearance()

    const handleImageClick = (src: string) => {
        onImageSelect(src)
    }

    return (
        <>
            {/* Status Section */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.sm || '12px',
                    marginBottom: theme.spacing?.xs || '8px'
                }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: priorityColors[formData.priority]
                    }}></div>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#666'
                    }}>Status</span>
                </div>
                <select
                    value={formData.priority}
                    onChange={(e) => onFormDataChange('priority', e.target.value)}
                    style={{
                        width: '100%',
                        padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                        border: '1px solid #cbd5e1',
                        borderRadius: theme.radius?.sm || '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        maxWidth: '100%'
                    }}
                >
                    <option value="LOW">{priorityLabels.LOW}</option>
                    <option value="MEDIUM">{priorityLabels.MEDIUM}</option>
                    <option value="HIGH">{priorityLabels.HIGH}</option>
                </select>
            </div>

            {/* Assign Section */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.sm || '12px',
                    marginBottom: theme.spacing?.xs || '8px'
                }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                    }}>👤</div>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#666'
                    }}>Assign</span>
                </div>
                <select
                    value={formData.assigneeId}
                    onChange={(e) => onFormDataChange('assigneeId', e.target.value)}
                    style={{
                        width: '100%',
                        padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                        border: '1px solid #cbd5e1',
                        borderRadius: theme.radius?.sm || '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        maxWidth: '100%'
                    }}
                >
                    <option value="">Sem responsável</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                </select>
            </div>

            {/* M&A Fields Section */}
            <div style={{
                marginBottom: theme.spacing?.lg || '20px',
                padding: theme.spacing?.md || '16px',
                backgroundColor: (theme.surfaceAlt || '#f8f9fa') + '30',
                borderRadius: theme.radius?.sm || '6px',
                border: `1px solid ${theme.border || '#e1e1e1'}`
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.sm || '12px',
                    marginBottom: theme.spacing?.md || '16px'
                }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                    }}>🏢</div>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: theme.textPrimary || '#333'
                    }}>M&A Fields</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing?.md || '16px', marginBottom: theme.spacing?.sm || '12px' }}>
                    {/* Owner */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: theme.spacing?.xs || '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Owner
                        </label>
                        <select
                            value={formData.ownerId}
                            onChange={(e) => onFormDataChange('ownerId', e.target.value)}
                            style={{
                                width: '100%',
                                padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                                border: '1px solid #cbd5e1',
                                borderRadius: theme.radius?.sm || '6px',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                color: '#111827',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Sem owner</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Risk Level */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: theme.spacing?.xs || '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Risk Level
                        </label>
                        <select
                            value={formData.riskLevel}
                            onChange={(e) => onFormDataChange('riskLevel', e.target.value)}
                            style={{
                                width: '100%',
                                padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                                border: '1px solid #cbd5e1',
                                borderRadius: theme.radius?.sm || '6px',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                color: '#111827',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Sem risco</option>
                            <option value="LOW">Baixo Risco</option>
                            <option value="MEDIUM">Médio Risco</option>
                            <option value="HIGH">Alto Risco</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing?.md || '16px' }}>
                    {/* Deadline */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: theme.spacing?.xs || '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => onFormDataChange('deadline', e.target.value)}
                            style={{
                                width: '100%',
                                padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                                border: '1px solid #cbd5e1',
                                borderRadius: theme.radius?.sm || '6px',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                color: '#111827',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Description Section */}
            <div style={{ width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.sm || '12px',
                    marginBottom: theme.spacing?.xs || '8px'
                }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                    }}>📝</div>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#666'
                    }}>Description</span>
                </div>
                <RichTextEditor
                    value={formData.description}
                    onChange={(html) => onFormDataChange('description', html)}
                />

                {/* Image Preview */}
                {(() => {
                    const images = extractImages(formData.description)
                    if (images.length === 0) return null

                    return (
                        <div style={{ marginTop: theme.spacing?.sm || '8px' }}>
                            <span style={{
                                fontSize: '12px',
                                color: '#666',
                                display: 'block',
                                marginBottom: theme.spacing?.xs || '6px'
                            }}>Images ({images.length})</span>
                            <div style={{
                                display: 'flex',
                                gap: theme.spacing?.xs || '8px',
                                flexWrap: 'wrap'
                            }}>
                                {images.map((src, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleImageClick(src)}
                                        style={{
                                            width: '60px',
                                            height: '40px',
                                            border: '1px solid #e1e1e1',
                                            borderRadius: theme.radius?.sm || '4px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            backgroundColor: '#f8f9fa'
                                        }}
                                    >
                                        <img
                                            src={src}
                                            alt={`Preview ${index + 1}`}
                                            loading="lazy"
                                            decoding="async"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* Add Property Button */}
            <button
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.xs || '8px',
                    padding: `${theme.spacing?.xs || '8px'} ${theme.spacing?.sm || '12px'}`,
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e1e1e1',
                    borderRadius: theme.radius?.sm || '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#666',
                    width: 'fit-content'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e8e8e8'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
            >
                <span>+</span>
                Add a property
            </button>

            {/* Comments Section */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing?.sm || '12px',
                    marginBottom: theme.spacing?.xs || '8px'
                }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                    }}>💬</div>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#666'
                    }}>Comments</span>
                </div>
                <textarea
                    placeholder="Add a comment..."
                    style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: theme.spacing?.sm || '12px',
                        border: '1px solid #e1e1e1',
                        borderRadius: theme.radius?.sm || '6px',
                        fontSize: '14px',
                        color: '#213547',
                        backgroundColor: '#f8f9fa',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: '1.5',
                        boxSizing: 'border-box',
                        maxWidth: '100%',
                        overflowWrap: 'anywhere'
                    }}
                />
            </div>
        </>
    )
}
