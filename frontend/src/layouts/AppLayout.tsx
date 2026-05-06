import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { postLogout } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'
import { GlobalHeader } from '@/components/layout/GlobalHeader'

// ── SVG icons ──────────────────────────────────────────────────
function IconRoadmap() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,11 6,6 10,9 14,4" />
      <polyline points="11,4 14,4 14,7" />
    </svg>
  )
}
function IconBacklog() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="4" y1="4" x2="13" y2="4" />
      <line x1="4" y1="8" x2="13" y2="8" />
      <line x1="4" y1="12" x2="10" y2="12" />
      <circle cx="2" cy="4" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="2" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="2" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconBoard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="13" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="8" rx="1" />
    </svg>
  )
}
function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="3" height="6" rx="0.5" />
      <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
      <rect x="11" y="2" width="3" height="12" rx="0.5" />
    </svg>
  )
}
function IconIssues() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.25" />
      <line x1="8" y1="5" x2="8" y2="8.5" />
      <circle cx="8" cy="11" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
    </svg>
  )
}
function IconSupport() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6 6.2c0-1.1.9-2 2-2s2 .9 2 2c0 1-.6 1.6-1.3 2-.5.3-.7.7-.7 1.2" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
function AppLogo() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="12" rx="1" fill="white" fillOpacity="0.9" />
        <rect x="9" y="2" width="5" height="7" rx="1" fill="white" fillOpacity="0.6" />
      </svg>
    </div>
  )
}

// ── Nav config ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/roadmap', label: 'Roadmap',  Icon: IconRoadmap },
  { to: '/backlog', label: 'Backlog',  Icon: IconBacklog  },
  { to: '/board',   label: 'Board',    Icon: IconBoard    },
  { to: '/reports', label: 'Reports',  Icon: IconReports  },
  { to: '/issues',  label: 'Issues',   Icon: IconIssues   },
]

// ── Sidebar content ─────────────────────────────────────────────
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setCreateModalOpen = useAppStore((s) => s.setCreateModalOpen)

  async function handleLogout() {
    await postLogout()
    setCurrentUser(null)
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-full flex-col justify-between px-3 py-5">
      {/* Top: logo + nav */}
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-1">
          <AppLogo />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-[#0c0e10]">Mini JIRA</span>
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
              Product Team
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] leading-[1.6] transition-colors ${
                  isActive
                    ? 'bg-white font-medium text-[#005bbf]'
                    : 'text-[#0c0e10] hover:bg-white/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#005bbf]' : 'text-[#acb3b8]'}>
                    <Icon />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Create Issue CTA */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="1" x2="7" y2="13" />
            <line x1="1" y1="7" x2="13" y2="7" />
          </svg>
          Create Issue
        </button>
      </div>

      {/* Bottom: settings + support + logout */}
      <div className="flex flex-col gap-0.5">
        <button className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] text-[#acb3b8] transition-colors hover:bg-white/60 hover:text-[#0c0e10]">
          <IconSettings /> Settings
        </button>
        <button className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] text-[#acb3b8] transition-colors hover:bg-white/60 hover:text-[#0c0e10]">
          <IconSupport /> Support
        </button>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="mt-2 text-left px-3 text-xs text-[#acb3b8] hover:text-[#005bbf]"
          >
            Cerrar sesión ({currentUser.email.split('@')[0]})
          </button>
        )}
      </div>
    </div>
  )
}

// ── Layout ──────────────────────────────────────────────────────
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f9f9fb]">

      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-shrink-0 bg-[#f2f4f6] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-12 items-center justify-between bg-[#f2f4f6] px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <AppLogo />
          <span className="text-sm font-semibold text-[#0c0e10]">Mini JIRA</span>
        </div>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1 text-[#0c0e10]"
          aria-label="Menú"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-60 bg-[#f2f4f6]"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent onNavClick={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden pt-12 lg:pt-0">
        <GlobalHeader />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
