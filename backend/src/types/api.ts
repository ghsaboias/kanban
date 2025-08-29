export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
}

export interface CreateColumnRequest {
  title: string;
  position?: number;
}

export interface UpdateColumnRequest {
  title?: string;
  position?: number;
}

export interface ReorderColumnRequest {
  position: number;
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: string;
  createdById?: string; // ignored when auth is enabled
  position?: number;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: string;
  position?: number;
}

export interface MoveCardRequest {
  columnId: string;
  position: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}
