export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: string
}

export interface User {
  id: string
  name: string
  email: string
}

export interface Activity {
  id: string
  entityType: 'BOARD' | 'COLUMN' | 'CARD'
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER' | 'ASSIGN' | 'UNASSIGN'
  boardId: string
  columnId?: string | null
  userId?: string | null
  user?: User | null
  meta: Record<string, unknown>
  createdAt: string
}

export interface ActivityFeedData {
  activities: Activity[]
  board: {
    id: string
    title: string
  }
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasMore: boolean
    hasPrev: boolean
    nextPage: number | null
    prevPage: number | null
  }
}
