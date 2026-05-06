import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { postAuthCallback } from '@/api/auth'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code       = params.get('code')
    const state      = params.get('state')
    const savedState = sessionStorage.getItem('oauth_state')
    sessionStorage.removeItem('oauth_state')

    if (!code || !state || state !== savedState) {
      navigate('/login', { replace: true })
      return
    }

    postAuthCallback(code)
      .then(() => navigate('/board', { replace: true }))
      .catch(() => navigate('/login', { replace: true }))
  }, [params, navigate])

  return (
    <div className="flex flex-col items-center gap-4 text-[#acb3b8]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
      <p className="text-sm">Autenticando…</p>
    </div>
  )
}
