import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { postLogout } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function GlobalHeader() {
  const currentUser = useAppStore((s) => s.currentUser)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const initials = currentUser ? getInitials(currentUser.name) : '?'
  const [menuOpen, setMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)

  async function handleLogout() {
    setMenuOpen(false)
    await postLogout()
    setCurrentUser(null)
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-4 bg-white px-6">
      {/* Project name */}
      <span className="text-sm font-semibold text-[#0c0e10]">Lucid</span>

      {/* Search */}
      <div className="flex flex-1 items-center gap-2 rounded-full bg-[#f2f4f6] px-3 py-1.5 max-w-xs">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#acb3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="5" />
          <line x1="11" y1="11" x2="14" y2="14" />
        </svg>
        <input
          type="text"
          placeholder="Search tasks, sprints..."
          className="flex-1 bg-transparent text-[0.875rem] text-[#0c0e10] placeholder-[#acb3b8] outline-none"
        />
      </div>

      {/* Right icons + avatar */}
      <div className="ml-auto flex items-center gap-3">
        {/* Bell */}
        <button className="p-1 text-[#acb3b8] transition-colors hover:text-[#0c0e10]" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5v3l1.5 2H3l1.5-2V8A5.5 5.5 0 0 1 10 2.5Z" />
            <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" />
          </svg>
        </button>

        {/* Question */}
        <button className="p-1 text-[#acb3b8] transition-colors hover:text-[#0c0e10]" aria-label="Help">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="7.5" />
            <path d="M7.5 8c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 1.2-.75 2-1.6 2.5-.5.3-.9.85-.9 1.5" />
            <circle cx="10" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* Avatar with dropdown */}
        <div className="relative">
          <button
            ref={avatarRef}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#d7e2ff] transition-opacity hover:opacity-80"
            title={currentUser?.name}
            aria-label="Menú de usuario"
          >
            <span className="text-xs font-medium text-[#003d84]">{initials}</span>
          </button>

          {menuOpen && (
            <>
              {/* Backdrop para cerrar al hacer click fuera */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-11 z-20 w-52 rounded-xl bg-white py-1"
                style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.08)' }}
              >
                <div className="px-4 py-3 border-b border-[rgba(172,179,184,0.15)]">
                  <p className="text-[0.875rem] font-medium text-[#0c0e10]">{currentUser?.name}</p>
                  <p className="text-[0.75rem] text-[#acb3b8] truncate">{currentUser?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[0.875rem] text-[#752121] transition-colors hover:bg-[#f2f4f6]"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                    <polyline points="11,11 14,8 11,5" />
                    <line x1="14" y1="8" x2="6" y2="8" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
