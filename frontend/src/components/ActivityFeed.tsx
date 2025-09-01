// React import removed - not needed with new JSX transform
import type { Activity } from '../../../shared/realtime';

interface ActivityFeedProps {
  activities: Activity[];
  boardTitle: string;
  isLoading: boolean;
  className?: string;
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins === 1) return '1 minuto atrás';
    if (diffMins < 60) return `${diffMins} minutos atrás`;
    if (diffHours === 1) return '1 hora atrás';
    if (diffHours < 24) return `${diffHours} horas atrás`;
    if (diffDays === 1) return '1 dia atrás';
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString('pt-BR');
  };

  const getActionText = () => {
    const { entityType, action, user } = activity;
    const meta = typeof activity.meta === 'string' ? JSON.parse(activity.meta) : activity.meta;
    const userName = user?.name || 'Alguém';

    switch (entityType) {
      case 'BOARD':
        switch (action) {
          case 'CREATE':
            return `${userName} criou o quadro "${meta.title}"`;
          case 'UPDATE':
            if (meta.changes?.includes('title')) {
              return `${userName} renomeou o quadro para "${meta.newValues.title}"`;
            }
            return `${userName} atualizou o quadro`;
          case 'DELETE':
            return `${userName} excluiu o quadro "${meta.title}"`;
          default:
            return `${userName} modificou o quadro`;
        }

      case 'COLUMN':
        switch (action) {
          case 'CREATE':
            return `${userName} criou a coluna "${meta.title}"`;
          case 'UPDATE':
            if (meta.changes?.includes('title')) {
              return `${userName} renomeou a coluna para "${meta.newValues.title}"`;
            }
            return `${userName} atualizou a coluna`;
          case 'DELETE':
            return `${userName} excluiu a coluna "${meta.title}"`;
          case 'REORDER':
            return `${userName} reordenou a coluna`;
          default:
            return `${userName} modificou a coluna`;
        }

      case 'CARD':
        switch (action) {
          case 'CREATE':
            return `${userName} criou o card "${meta.title}"`;
          case 'UPDATE':
            if (meta.changes?.includes('title')) {
              return `${userName} renomeou o card para "${meta.newValues.title}"`;
            }
            if (meta.changes?.includes('assigneeId')) {
              const assigneeName = meta.assigneeName || 'sem responsável';
              return `${userName} atribuiu o card a ${assigneeName}`;
            }
            if (meta.changes?.includes('priority')) {
              const priorityLabels: { [key: string]: string } = {
                HIGH: 'Alta',
                MEDIUM: 'Média',
                LOW: 'Baixa'
              };
              return `${userName} alterou a prioridade para ${priorityLabels[meta.newValues.priority]}`;
            }
            return `${userName} atualizou o card "${meta.title || activity.entityId}"`;
          case 'DELETE':
            return `${userName} excluiu o card "${meta.title}"`;
          case 'MOVE':
            return `${userName} moveu o card "${meta.title}" para "${meta.toColumnTitle}"`;
          case 'REORDER':
            return `${userName} reordenou o card "${meta.title}"`;
          default:
            return `${userName} modificou o card`;
        }

      default:
        return `${userName} realizou uma ação`;
    }
  };

  const getEntityIcon = () => {
    switch (activity.entityType) {
      case 'BOARD':
        return '📋';
      case 'COLUMN':
        return '📂';
      case 'CARD':
        return '📄';
      default:
        return '📝';
    }
  };

  const getActionColor = () => {
    switch (activity.action) {
      case 'CREATE':
        return '#10b981'; // green
      case 'UPDATE':
        return '#3b82f6'; // blue
      case 'DELETE':
        return '#ef4444'; // red
      case 'MOVE':
        return '#8b5cf6'; // purple
      case 'REORDER':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: '16px', lineHeight: '1', marginTop: '2px' }}>
        {getEntityIcon()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4', marginBottom: '4px' }}>
          {getActionText()}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{formatDate(activity.createdAt)}</span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: getActionColor() }}></div>
          <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '500', color: getActionColor() }}>
            {activity.action}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ activities, boardTitle, isLoading, className }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className={className} style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280' }}>Carregando atividades...</div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span>
          Atividades do Quadro
        </h3>
        {boardTitle && (
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            {boardTitle}
          </p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {activities.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma atividade encontrada</div>
            <div style={{ fontSize: '14px' }}>As atividades aparecerão aqui conforme você usar o quadro.</div>
          </div>
        ) : (
          activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}
