import type { User } from '../../../shared/realtime'
import { useTheme } from '../theme/useTheme'

interface KanbanHeaderProps {
  title: string
  description?: string | null
  isConnected: boolean
  onlineUsers: Array<{ userId: string; user: User }>
  onTitleChange?: (newTitle: string) => void
  editable?: boolean
}

export function KanbanHeader({ 
  title, 
  description, 
  isConnected, 
  onlineUsers, 
  onTitleChange,
  editable = false 
}: KanbanHeaderProps) {
  const { theme } = useTheme()

  const headerStyle = {
    padding: `${theme.spacing?.xl || '24px'} ${theme.spacing?.xl || '24px'} ${theme.spacing?.md || '16px'} ${theme.spacing?.xl || '24px'}`,
    backgroundColor: theme.background,
    borderBottom: `1px solid ${theme.border}`
  }

  const titleContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing?.sm || '8px'
  }

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: theme.textPrimary,
    margin: 0,
    letterSpacing: '-0.02em'
  }

  const descriptionStyle = {
    fontSize: '16px',
    color: theme.textSecondary,
    margin: `${theme.spacing?.xs || '4px'} 0 0 0`,
    lineHeight: '1.4'
  }

  const statusContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.md || '16px',
    fontSize: '14px'
  }

  const connectionStatusStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.xs || '6px',
    color: isConnected ? theme.success || '#28a745' : theme.danger || '#dc3545',
    fontWeight: '500'
  }

  const connectionDotStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isConnected ? theme.success || '#28a745' : theme.danger || '#dc3545'
  }

  const onlineUsersStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.sm || '8px',
    color: theme.textMuted
  }

  const avatarContainerStyle = {
    display: 'flex',
    gap: theme.spacing?.xs || '4px',
    marginLeft: theme.spacing?.sm || '8px'
  }

  const avatarStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: theme.accent,
    color: theme.accentText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    border: `2px solid ${theme.surface}`,
    boxShadow: theme.shadow?.sm || 'none'
  }

  const moreUsersStyle = {
    ...avatarStyle,
    backgroundColor: theme.muted,
    fontSize: '10px'
  }

  return (
    <div style={headerStyle}>
      <div style={titleContainerStyle}>
        <div>
          {editable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              style={{
                ...titleStyle,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                minWidth: '200px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                e.currentTarget.style.borderRadius = theme.radius?.sm || '4px'
                e.currentTarget.style.padding = '4px 8px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.padding = '0'
              }}
            />
          ) : (
            <h1 style={titleStyle}>{title}</h1>
          )}
          
          {description && (
            <p style={descriptionStyle}>{description}</p>
          )}
        </div>

        <div style={statusContainerStyle}>
          {/* Connection Status */}
          <div style={connectionStatusStyle}>
            <div style={connectionDotStyle} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Online Users */}
          {onlineUsers.length > 0 && (
            <div style={onlineUsersStyle}>
              <span>👥</span>
              <span>{onlineUsers.length} online</span>
              
              <div style={avatarContainerStyle}>
                {onlineUsers.slice(0, 4).map((user) => (
                  <div
                    key={user.userId}
                    style={avatarStyle}
                    title={`${user.user.name} (${user.user.email})`}
                  >
                    {user.user.name?.charAt(0) || '?'}
                  </div>
                ))}
                
                {onlineUsers.length > 4 && (
                  <div
                    style={moreUsersStyle}
                    title={`${onlineUsers.length - 4} more users online`}
                  >
                    +{onlineUsers.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}