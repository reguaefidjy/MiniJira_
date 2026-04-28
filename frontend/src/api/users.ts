import type { User } from '@/types'

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}
