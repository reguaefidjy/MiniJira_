import { useState } from 'react'
import { DragDropContext, type DropResult, type DragStart } from '@hello-pangea/dnd'
import type { Ticket, TicketStatus } from '@/types'
import { useTickets } from '@/hooks/useTickets'
import { useUpdateTicket } from '@/hooks/useUpdateTicket'
import { useAppStore } from '@/store/useAppStore'
import { canEditTicket } from '@/lib/permissions'
import { KanbanColumn } from './KanbanColumn'

const COLUMNS: TicketStatus[] = ['todo', 'in_progress', 'review', 'done']

const COLUMN_LABELS: Record<TicketStatus, string> = {
  todo:        'Por hacer',
  in_progress: 'En progreso',
  review:      'Review',
  done:        'Listo',
}

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  todo:        ['in_progress'],
  in_progress: ['todo', 'review'],
  review:      ['in_progress', 'done'],
  done:        ['review'],
}

interface Props {
  onTicketClick: (id: string) => void
}

export function KanbanBoard({ onTicketClick }: Props) {
  const boardFilters = useAppStore((s) => s.boardFilters)
  const currentUser  = useAppStore((s) => s.currentUser)
  const { data: tickets = [], isLoading } = useTickets(boardFilters)
  const { mutate: updateTicket } = useUpdateTicket()

  const [dragError,         setDragError]         = useState<string | null>(null)
  const [draggingTicket,    setDraggingTicket]    = useState<Ticket | null>(null)

  function handleDragStart(start: DragStart) {
    const ticket = tickets.find((t) => t.id === start.draggableId)
    setDraggingTicket(ticket ?? null)
    setDragError(null)
  }

  function handleDragEnd(result: DropResult) {
    setDraggingTicket(null)

    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const ticket = tickets.find((t) => t.id === draggableId)
    if (!ticket) return

    const newStatus = destination.droppableId as TicketStatus

    if (currentUser && !canEditTicket(ticket, currentUser)) {
      setDragError('No tienes permiso para mover este ticket.')
      return
    }

    if (!VALID_TRANSITIONS[ticket.status].includes(newStatus)) {
      setDragError(
        `No se puede mover directamente de "${COLUMN_LABELS[ticket.status]}" a "${COLUMN_LABELS[newStatus]}".`
      )
      return
    }

    setDragError(null)
    updateTicket({ id: ticket.id, data: { status: newStatus, version: ticket.version } })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {dragError && (
        <div className="mx-4 mt-2 flex items-center justify-between rounded-md bg-[#fe8983]/15 px-3 py-2 text-sm text-[#752121]">
          <span>{dragError}</span>
          <button
            onClick={() => setDragError(null)}
            className="ml-4 font-medium underline hover:no-underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={tickets.filter((t) => t.status === status)}
              onTicketClick={onTicketClick}
              isDropDisabled={
                draggingTicket !== null &&
                !VALID_TRANSITIONS[draggingTicket.status].includes(status)
              }
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
