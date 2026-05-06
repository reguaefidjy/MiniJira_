import type { CurrentUser, Ticket } from '@/types'
import { canEditTicket } from '@/lib/permissions'
import { StatusChip } from '@/components/shared/StatusChip'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatar'
import { LabelTag } from '@/components/shared/LabelTag'

interface Props {
  ticket:      Ticket
  currentUser: CurrentUser | null
  onOpen:      (id: string) => void
  onStart:     (ticket: Ticket) => void
  isStarting:  boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  >= 1) return `hace ${days} día${days !== 1 ? 's' : ''}`
  if (hours >= 1) return `hace ${hours} h`
  if (mins  >= 1) return `hace ${mins} min`
  return 'justo ahora'
}

export function BacklogRow({ ticket, currentUser, onOpen, onStart, isStarting }: Props) {
  const canStart = ticket.status === 'todo' && currentUser !== null && canEditTicket(ticket, currentUser)

  return (
    <div
      onClick={() => onOpen(ticket.id)}
      className="flex cursor-pointer items-start gap-3 px-6 py-3 transition-colors hover:bg-[#f2f4f6]"
    >
      {/* Columna izquierda: short_id */}
      <span className="w-14 flex-shrink-0 pt-0.5 text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
        {ticket.short_id ?? ''}
      </span>

      {/* Columna central: título + meta */}
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <span className="truncate text-[0.875rem] font-medium text-[#0c0e10]">
            {ticket.title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ticket.labels.map((l) => (
            <LabelTag key={l.id} label={l} />
          ))}
          <span className="text-[0.6875rem] text-[#acb3b8]">
            {timeAgo(ticket.created_at)}
          </span>
        </div>
      </div>

      {/* Columna derecha: status + assignees + acción */}
      <div
        className="flex flex-shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusChip status={ticket.status} />

        {ticket.assignees.length > 0 && (
          <AssigneeAvatarStack users={ticket.assignees} max={3} />
        )}

        {canStart && (
          <button
            type="button"
            disabled={isStarting}
            onClick={() => onStart(ticket)}
            title="Mover a En progreso"
            className="rounded-md border px-2 py-1 text-xs font-medium text-[#005bbf] transition-colors hover:bg-[#d7e2ff]/30 disabled:opacity-50"
            style={{ borderColor: 'rgba(172,179,184,0.20)' }}
          >
            {isStarting ? '…' : '⚡ Iniciar'}
          </button>
        )}
      </div>
    </div>
  )
}
