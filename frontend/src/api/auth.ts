import type { CurrentUser } from '@/types'

export async function fetchMe(): Promise<CurrentUser> {
  const res = await fetch('/api/me', { credentials: 'include' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export async function postAuthCallback(code: string): Promise<void> {
  const res = await fetch('/api/auth/callback', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Auth callback failed')
}

export async function postAuthRefresh(): Promise<void> {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error('Refresh failed')
}

export async function postLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
