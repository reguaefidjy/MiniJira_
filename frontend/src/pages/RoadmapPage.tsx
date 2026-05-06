import { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useUsers } from '@/hooks/useUsers'
import { useAppStore } from '@/store/useAppStore'
import { TicketDrawer } from '@/components/ticket/TicketDrawer'
import { RoadmapSwimlane } from '@/components/roadmap/RoadmapSwimlane'
import type { TicketPriority } from '@/types'

const PRIORITIES: TicketPriority[] = ['high', 'medium', 'low']

export function RoadmapPage() {
  const [assigneeFilter,  setAssigneeFilter]  = useState<string | null>(null)
  const [activeTicketId,  setActiveTicketId]  = useState<string | null>(null)

  const currentUser = useAppStore((s) => s.currentUser)

  const { data: tickets = [], isLoading } = useTickets({
    status:          [],
    priority:        [],
    assignee_id:     assigneeFilter,
    labels:          [],
    created_at_from: null,
    created_at_to:   null,
  })

  const { data: users = [] } = useUsers()

  const total = tickets.length
  const done  = tickets.filter((t) => t.status === 'done').length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e4e9ee]/50 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[#0c0e10]">
              Roadmap
            </h1>
            {currentUser && (
              <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
                {currentUser.name}
              </p>
            )}
          </div>

          {/* Filtro por asignado */}
          {users.length > 0 && (
            <select
              value={assigneeFilter ?? ''}
              onChange={(e) => setAssigneeFilter(e.target.value || null)}
              className="rounded-md bg-[#f2f4f6] px-3 py-1.5 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
            >
              <option value="">Todos los miembros</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Barra de progreso global */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e4e9ee]">
            <div
              className="h-full rounded-full bg-[#69f6b8] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[0.6875rem] tabular-nums text-[#acb3b8]">
            {pct}% completado ({done}/{total})
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
          </div>
        ) : total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#acb3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="24" height="18" rx="3" />
              <path d="M10 10V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              <line x1="16" y1="16" x2="16" y2="22" />
              <line x1="13" y1="19" x2="19" y2="19" />
            </svg>
            <p className="text-[0.875rem] text-[#acb3b8]">No hay tickets en el roadmap.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {PRIORITIES.map((priority) => (
              <RoadmapSwimlane
                key={priority}
                priority={priority}
                tickets={tickets.filter((t) => t.priority === priority)}
                onTicketClick={setActiveTicketId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer reutilizado */}
      <TicketDrawer
        ticketId={activeTicketId}
        onClose={() => setActiveTicketId(null)}
      />
    </div>
  )
}
