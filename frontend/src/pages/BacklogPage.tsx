import { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useUpdateTicket } from '@/hooks/useUpdateTicket'
import { useAppStore } from '@/store/useAppStore'
import { TicketDrawer } from '@/components/ticket/TicketDrawer'
import { BacklogToolbar } from '@/components/backlog/BacklogToolbar'
import { BacklogRow } from '@/components/backlog/BacklogRow'
import type { Ticket, TicketPriority, TicketStatus } from '@/types'

const PRIORITY_ORDER: Record<TicketPriority, number> = { high: 0, medium: 1, low: 2 }

export function BacklogPage() {
  const [priorityFilter,    setPriorityFilter]    = useState<TicketPriority[]>([])
  const [assigneeFilter,    setAssigneeFilter]    = useState<string | null>(null)
  const [labelFilter,       setLabelFilter]       = useState<string | null>(null)
  const [includeInProgress, setIncludeInProgress] = useState(false)
  const [activeTicketId,    setActiveTicketId]    = useState<string | null>(null)
  const [startingId,        setStartingId]        = useState<string | null>(null)

  const currentUser = useAppStore((s) => s.currentUser)

  const statusFilter: TicketStatus[] = includeInProgress
    ? ['todo', 'in_progress']
    : ['todo']

  const { data: tickets = [], isLoading } = useTickets({
    status:          statusFilter,
    priority:        priorityFilter,
    assignee_id:     assigneeFilter,
    labels:          labelFilter ? [labelFilter] : [],
    created_at_from: null,
    created_at_to:   null,
  })

  const { mutate: updateTicket } = useUpdateTicket()

  const sorted = [...tickets].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (byPriority !== 0) return byPriority
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const hasFilters =
    priorityFilter.length > 0 ||
    assigneeFilter !== null ||
    labelFilter !== null ||
    includeInProgress

  function handleClear() {
    setPriorityFilter([])
    setAssigneeFilter(null)
    setLabelFilter(null)
    setIncludeInProgress(false)
  }

  function handleStart(ticket: Ticket) {
    setStartingId(ticket.id)
    updateTicket(
      { id: ticket.id, data: { status: 'in_progress', version: ticket.version } },
      { onSettled: () => setStartingId(null) },
    )
  }

  const statusLabel = includeInProgress ? 'Por hacer y En progreso' : 'Por hacer'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[#0c0e10]">
            Backlog
          </h1>
          {!isLoading && (
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <BacklogToolbar
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        labelFilter={labelFilter}
        includeInProgress={includeInProgress}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onLabelChange={setLabelFilter}
        onIncludeInProgressChange={setIncludeInProgress}
        onClear={handleClear}
        hasFilters={hasFilters}
      />

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#acb3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="20" height="24" rx="2" />
              <line x1="11" y1="10" x2="21" y2="10" />
              <line x1="11" y1="15" x2="21" y2="15" />
              <line x1="11" y1="20" x2="17" y2="20" />
            </svg>
            {hasFilters ? (
              <>
                <p className="text-[0.875rem] text-[#acb3b8]">
                  No hay tickets con los filtros seleccionados.
                </p>
                <button
                  onClick={handleClear}
                  className="text-sm text-[#005bbf] hover:underline"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <p className="text-[0.875rem] text-[#acb3b8]">
                El backlog está vacío. ¡Todo el trabajo está en marcha!
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#e4e9ee]/40">
            {sorted.map((ticket) => (
              <BacklogRow
                key={ticket.id}
                ticket={ticket}
                currentUser={currentUser}
                onOpen={setActiveTicketId}
                onStart={handleStart}
                isStarting={startingId === ticket.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <TicketDrawer
        ticketId={activeTicketId}
        onClose={() => setActiveTicketId(null)}
      />
    </div>
  )
}
