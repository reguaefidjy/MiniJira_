import type { User, UserRole } from '@/types'

export interface AdminUser extends User {
  is_active: boolean
}

export async function adminCreateUser(data: {
  name: string
  email: string
  role: UserRole
}): Promise<AdminUser> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create user')
  return res.json()
}

export async function adminUpdateUser(
  id: string,
  data: { name?: string; email?: string; role?: UserRole },
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update user')
  return res.json()
}

export async function adminDeactivateUser(id: string): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}/deactivate`, {
    method: 'PATCH',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to deactivate user')
  return res.json()
}
