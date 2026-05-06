import { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { TicketDrawer } from '@/components/ticket/TicketDrawer'
import { IssuesToolbar } from '@/components/issues/IssuesToolbar'
import { IssuesRow } from '@/components/issues/IssuesRow'
import type { TicketPriority, TicketStatus } from '@/types'

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo:        'Por hacer',
  in_progress: 'En progreso',
  review:      'Review',
  done:        'Listo',
}

export function IssuesPage() {
  const [statusFilter,   setStatusFilter]   = useState<TicketStatus[]>([])
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [labelFilter,    setLabelFilter]    = useState<string | null>(null)
  const [createdAtFrom,  setCreatedAtFrom]  = useState<string | null>(null)
  const [createdAtTo,    setCreatedAtTo]    = useState<string | null>(null)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  const hasFilters =
    statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    assigneeFilter !== null ||
    labelFilter !== null ||
    createdAtFrom !== null ||
    createdAtTo !== null

  function handleClear() {
    setStatusFilter([])
    setPriorityFilter([])
    setAssigneeFilter(null)
    setLabelFilter(null)
    setCreatedAtFrom(null)
    setCreatedAtTo(null)
  }

  const { data: tickets = [], isLoading } = useTickets({
    status:          statusFilter,
    priority:        priorityFilter,
    assignee_id:     assigneeFilter,
    labels:          labelFilter ? [labelFilter] : [],
    created_at_from: createdAtFrom,
    created_at_to:   createdAtTo,
  })

  const sorted = [...tickets].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )

  const statusLabel =
    statusFilter.length === 0
      ? 'Todos los estados'
      : statusFilter.map((s) => STATUS_LABELS[s]).join(', ')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[#0c0e10]">Issues</h1>
          {!isLoading && (
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <IssuesToolbar
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        labelFilter={labelFilter}
        createdAtFrom={createdAtFrom}
        createdAtTo={createdAtTo}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onLabelChange={setLabelFilter}
        onCreatedAtFromChange={setCreatedAtFrom}
        onCreatedAtToChange={setCreatedAtTo}
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
                No hay tickets en el proyecto todavía.
              </p>
            )}
          </div>
        ) : (
          <div role="table" className="divide-y divide-[#e4e9ee]/40">
            {sorted.map((ticket) => (
              <IssuesRow
                key={ticket.id}
                ticket={ticket}
                onOpen={setActiveTicketId}
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
