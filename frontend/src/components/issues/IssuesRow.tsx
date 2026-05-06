import type { Ticket } from '@/types'
import { StatusChip } from '@/components/shared/StatusChip'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { BlockedBadge } from '@/components/shared/BlockedBadge'
import { LabelTag } from '@/components/shared/LabelTag'
import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatar'

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `hace ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `hace ${diffD}d`
  const diffW = Math.floor(diffD / 7)
  return `hace ${diffW}sem`
}

interface Props {
  ticket: Ticket
  onOpen: (id: string) => void
}

export function IssuesRow({ ticket, onOpen }: Props) {
  return (
    <div
      role="row"
      onClick={() => onOpen(ticket.id)}
      className="flex cursor-pointer items-center gap-4 border-b border-[#e4e9ee]/40 px-6 py-3 transition-colors hover:bg-[#f2f4f6]"
    >
      {/* short_id */}
      <span className="w-20 shrink-0 text-[0.6875rem] text-[#acb3b8]">
        {ticket.short_id ? `#${ticket.short_id}` : null}
      </span>

      {/* StatusChip */}
      <div className="w-32 shrink-0">
        <StatusChip status={ticket.status} />
      </div>

      {/* Título + etiquetas + bloqueado */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm text-[#0c0e10]">{ticket.title}</span>
        {(ticket.labels.length > 0 || ticket.is_blocked) && (
          <div className="flex flex-wrap items-center gap-1">
            {ticket.labels.map((l) => (
              <LabelTag key={l.id} label={l} />
            ))}
            {ticket.is_blocked && <BlockedBadge />}
          </div>
        )}
      </div>

      {/* PriorityBadge */}
      <div className="w-20 shrink-0">
        <PriorityBadge priority={ticket.priority} />
      </div>

      {/* Asignados */}
      <div className="w-20 shrink-0">
        <AssigneeAvatarStack users={ticket.assignees} max={3} />
      </div>

      {/* updated_at */}
      <span className="w-24 shrink-0 text-right text-xs text-[#acb3b8]">
        {formatRelative(ticket.updated_at)}
      </span>
    </div>
  )
}
