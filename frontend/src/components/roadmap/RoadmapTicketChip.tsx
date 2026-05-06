import type { Ticket } from '@/types'
import { StatusChip } from '@/components/shared/StatusChip'
import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatar'

interface Props {
  ticket: Ticket
  onClick: (id: string) => void
}

export function RoadmapTicketChip({ ticket, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick(ticket.id)}
      className="flex min-w-[200px] max-w-[240px] flex-col gap-2 rounded-lg bg-white p-3 text-left transition-colors hover:bg-[#f2f4f6]"
      style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}
    >
      <StatusChip status={ticket.status} />

      <p className="line-clamp-2 text-[0.875rem] leading-[1.4] text-[#0c0e10]">
        {ticket.title}
      </p>

      {ticket.assignees.length > 0 && (
        <AssigneeAvatarStack users={ticket.assignees} max={3} />
      )}
    </button>
  )
}
