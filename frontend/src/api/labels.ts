import type { Label } from '@/types'

export async function fetchLabels(): Promise<Label[]> {
  const res = await fetch('/api/labels', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch labels')
  return res.json()
}

export async function createLabel(data: { name: string; color: string }): Promise<Label> {
  const res = await fetch('/api/labels', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create label')
  return res.json()
}

export async function updateLabel(
  id: string,
  data: { name?: string; color?: string },
): Promise<Label> {
  const res = await fetch(`/api/labels/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update label')
  return res.json()
}

export async function deleteLabel(id: string): Promise<void> {
  const res = await fetch(`/api/labels/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to delete label')
}
