export type UserRole = 'admin' | 'member'
export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  short_id: string
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  is_blocked: boolean
  version: number
  created_by: string
  archived_at: string | null
  created_at: string
  updated_at: string
  assignees: User[]
  labels: string[]
  created_by_user: User
  comment_count: number
}

export interface Comment {
  id: string
  ticket_id: string
  author_id: string
  author: User
  body: string
  archived_at: string | null
  created_at: string
}

export interface MetricsSnapshot {
  tickets_by_status: Record<TicketStatus, number>
  tickets_closed_by_month: Array<{ month: string; count: number }>
  tickets_by_member: Array<{ user: User; active_count: number }>
  total: number
}

export interface BoardFilters {
  status: TicketStatus[]
  priority: TicketPriority[]
  assignee_id: string | null
  labels: string[]
  created_at_from: string | null
  created_at_to: string | null
}

export interface MetricsFilters {
  from: string
  to: string
  status: TicketStatus[]
  assignee_id: string | null
}

export interface TicketFormValues {
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  is_blocked: boolean
  assignee_ids: string[]
  labels: string[]
  version: number
}

export interface CommentFormValues {
  body: string
}

export type CurrentUser = User
