import { Droppable } from '@hello-pangea/dnd'
import type { Ticket, TicketStatus } from '@/types'
import { TicketCard } from './TicketCard'

const COLUMN_LABELS: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

const COLUMN_DOT: Record<TicketStatus, string> = {
  todo: 'bg-[#acb3b8]',
  in_progress: 'bg-[#005bbf]',
  review: 'bg-[#acb3b8]',
  done: 'bg-[#69f6b8]',
}

interface Props {
  status: TicketStatus
  tickets: Ticket[]
  onTicketClick: (id: string) => void
  isDropDisabled?: boolean
}

export function KanbanColumn({ status, tickets, onTicketClick, isDropDisabled = false }: Props) {
  return (
    <div
      className="flex min-w-[280px] flex-1 flex-col rounded-xl bg-[#f2f4f6] p-3 transition-opacity"
      style={{ opacity: isDropDisabled ? 0.45 : 1 }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
            {COLUMN_LABELS[status]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e4e9ee] text-[10px] font-medium text-[#0c0e10]">
            {tickets.length}
          </span>
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-[#acb3b8] transition-colors hover:text-[#0c0e10]"
            aria-label="Column options"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.2" />
              <circle cx="8" cy="8" r="1.2" />
              <circle cx="8" cy="13" r="1.2" />
            </svg>
          </button>
        </div>
      </div>

      <Droppable droppableId={status} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors"
            style={{
              background: snapshot.isDraggingOver
                ? 'rgba(215, 226, 255, 0.40)'
                : 'transparent',
              minHeight: 80,
            }}
          >
            {tickets.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#acb3b8]/30 py-8 text-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#acb3b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="16" height="12" rx="2" />
                  <path d="M6 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="text-[0.75rem] text-[#acb3b8]">Drop items here</span>
              </div>
            )}
            {tickets.map((ticket, index) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                index={index}
                onClick={onTicketClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
