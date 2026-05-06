import type { Ticket, TicketPriority } from '@/types'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { RoadmapTicketChip } from './RoadmapTicketChip'

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  high:   'Alta prioridad',
  medium: 'Media prioridad',
  low:    'Baja prioridad',
}

interface Props {
  priority: TicketPriority
  tickets: Ticket[]
  onTicketClick: (id: string) => void
}

export function RoadmapSwimlane({ priority, tickets, onTicketClick }: Props) {
  const done = tickets.filter((t) => t.status === 'done').length
  const pct  = tickets.length > 0 ? Math.round((done / tickets.length) * 100) : 0

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PriorityBadge priority={priority} />
        <span className="text-[0.875rem] font-medium text-[#0c0e10]">
          {PRIORITY_LABELS[priority]}
        </span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e4e9ee] px-1.5 text-[10px] font-medium text-[#0c0e10]">
          {tickets.length}
        </span>

        {/* Mini barra de progreso */}
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e4e9ee]">
            <div
              className="h-full rounded-full bg-[#69f6b8] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-8 text-right text-[0.6875rem] text-[#acb3b8]">{pct}%</span>
        </div>
      </div>

      {/* Chips */}
      {tickets.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[#acb3b8]/30">
          <span className="text-[0.75rem] text-[#acb3b8]">Sin tickets en esta prioridad</span>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {tickets.map((ticket) => (
            <RoadmapTicketChip
              key={ticket.id}
              ticket={ticket}
              onClick={onTicketClick}
            />
          ))}
        </div>
      )}
    </section>
  )
}
