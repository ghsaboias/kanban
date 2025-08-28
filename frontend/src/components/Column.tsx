import { Card } from './Card'

interface CardData {
  id: string
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  position: number
  assignee: {
    id: string
    name: string
    email: string
  } | null
}

interface ColumnData {
  id: string
  title: string
  position: number
  cards: CardData[]
}

interface ColumnProps {
  column: ColumnData
}

export function Column({ column }: ColumnProps) {
  return (
    <div style={{ 
      minWidth: '300px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{column.title}</h3>
        <span style={{ 
          backgroundColor: '#ddd', 
          borderRadius: '12px', 
          padding: '4px 8px', 
          fontSize: '12px',
          color: '#666'
        }}>
          {column.cards.length}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {column.cards
          .sort((a, b) => a.position - b.position)
          .map(card => (
            <Card key={card.id} card={card} />
          ))}
        
        {column.cards.length === 0 && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }}>
            No cards in this column
          </div>
        )}
      </div>
    </div>
  )
}