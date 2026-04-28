import type { Comment, CurrentUser, Ticket } from '@/types'

export function canEditTicket(ticket: Ticket, user: CurrentUser): boolean {
  return user.role === 'admin' || ticket.created_by === user.id
}

export function canArchiveTicket(ticket: Ticket, user: CurrentUser): boolean {
  return canEditTicket(ticket, user)
}

export function canDeleteComment(comment: Comment, user: CurrentUser): boolean {
  return user.role === 'admin' || comment.author_id === user.id
}

export function canViewArchivedTickets(user: CurrentUser): boolean {
  return user.role === 'admin'
}
