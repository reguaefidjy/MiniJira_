import type { Comment } from '@/types'

export async function fetchComments(ticketId: string): Promise<Comment[]> {
  const res = await fetch(`/api/tickets/${ticketId}/comments`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}

export async function addComment(ticketId: string, body: string): Promise<Comment> {
  const res = await fetch(`/api/tickets/${ticketId}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error('Failed to add comment')
  return res.json()
}

export async function archiveComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/comments/${commentId}/archive`, {
    method: 'PATCH',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to archive comment')
}
