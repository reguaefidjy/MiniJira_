import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import type { CurrentUser } from '@/types'

export function LoginPage() {
  const navigate = useNavigate()
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)

  const [email, setEmail] = useState('test@minijira.dev')
  const [password, setPassword] = useState('test')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleOAuthLogin() {
    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)
    window.location.href = `/api/auth/login?state=${state}`
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message ?? 'Error al iniciar sesión')
        return
      }
      const user: CurrentUser = await res.json()
      setCurrentUser(user)
      navigate('/board', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-[2.75rem] font-semibold tracking-[-0.02em] text-[#0c0e10]">
          Mini Jira
        </h1>
        <p className="mt-2 text-[0.875rem] leading-[1.6] text-[#acb3b8]">
          Gestión de tareas del equipo
        </p>
      </div>

      <div className="w-80 rounded-xl bg-white p-8" style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}>
        {import.meta.env.DEV ? (
          <form onSubmit={handleDevLogin} className="flex flex-col gap-3">
            <p className="text-center text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
              Acceso desarrollo
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-[0.75rem] text-[#acb3b8]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-[rgba(172,179,184,0.20)] bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] outline-none focus:ring-2 focus:ring-[#005bbf]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[0.75rem] text-[#acb3b8]" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-[rgba(172,179,184,0.20)] bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] outline-none focus:ring-2 focus:ring-[#005bbf]"
              />
            </div>

            {error && (
              <p className="text-center text-[0.75rem] text-[#752121]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[rgba(172,179,184,0.20)]" />
              <span className="text-[0.6875rem] text-[#acb3b8]">o</span>
              <div className="h-px flex-1 bg-[rgba(172,179,184,0.20)]" />
            </div>

            <button
              type="button"
              onClick={handleOAuthLogin}
              className="w-full rounded-md border border-[rgba(172,179,184,0.20)] py-2.5 text-sm font-medium text-[#005bbf] transition-opacity hover:opacity-80"
            >
              Cuenta corporativa (OAuth)
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={handleOAuthLogin}
              className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
            >
              Iniciar sesión con cuenta corporativa
            </button>
            <p className="mt-4 text-center text-xs text-[#acb3b8]">
              Solo cuentas aprovisionadas por un administrador
            </p>
          </>
        )}
      </div>
    </div>
  )
}
