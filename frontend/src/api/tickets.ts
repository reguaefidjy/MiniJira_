import type { BoardFilters, Ticket, TicketFormValues } from '@/types'

function buildTicketParams(filters: BoardFilters): string {
  const params = new URLSearchParams()
  filters.status.forEach((s) => params.append('status', s))
  filters.priority.forEach((p) => params.append('priority', p))
  if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
  filters.labels.forEach((l) => params.append('label_id', l))
  if (filters.created_at_from) params.set('created_at_from', filters.created_at_from)
  if (filters.created_at_to) params.set('created_at_to', filters.created_at_to)
  return params.toString()
}

export async function fetchTickets(filters: BoardFilters): Promise<Ticket[]> {
  const qs = buildTicketParams(filters)
  const res = await fetch(`/api/tickets?${qs}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch ticket')
  return res.json()
}

export async function createTicket(
  data: Omit<TicketFormValues, 'version' | 'status'>,
): Promise<Ticket> {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create ticket')
  return res.json()
}

export async function updateTicket(
  id: string,
  data: Partial<TicketFormValues>,
): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const message =
      res.status === 409 ? 'Conflict'
      : res.status === 422 ? 'Transition not allowed'
      : res.status === 403 ? 'Forbidden'
      : 'Failed to update ticket'
    const error = new Error(message) as Error & { status: number }
    error.status = res.status
    throw error
  }
  return res.json()
}

export async function archiveTicket(id: string): Promise<void> {
  const res = await fetch(`/api/tickets/${id}/archive`, {
    method: 'PATCH',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to archive ticket')
}
