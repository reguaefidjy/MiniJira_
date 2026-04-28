import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import type { TicketStatus } from '@/types'
import { useTickets } from '@/hooks/useTickets'
import { useUpdateTicket } from '@/hooks/useUpdateTicket'
import { useAppStore } from '@/store/useAppStore'
import { KanbanColumn } from './KanbanColumn'

const COLUMNS: TicketStatus[] = ['todo', 'in_progress', 'review', 'done']

interface Props {
  onTicketClick: (id: string) => void
}

export function KanbanBoard({ onTicketClick }: Props) {
  const boardFilters = useAppStore((s) => s.boardFilters)
  const { data: tickets = [], isLoading } = useTickets(boardFilters)
  const { mutate: updateTicket } = useUpdateTicket()

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const ticket = tickets.find((t) => t.id === draggableId)
    if (!ticket) return

    const newStatus = destination.droppableId as TicketStatus
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={tickets.filter((t) => t.status === status)}
            onTicketClick={onTicketClick}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
