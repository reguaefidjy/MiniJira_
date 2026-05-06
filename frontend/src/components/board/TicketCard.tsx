import { Draggable } from '@hello-pangea/dnd'
import type { Ticket } from '@/types'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { BlockedBadge } from '@/components/shared/BlockedBadge'
import { AssigneeAvatar } from '@/components/shared/AssigneeAvatar'
import { LabelTag } from '@/components/shared/LabelTag'

interface Props {
  ticket: Ticket
  index: number
  onClick: (id: string) => void
}

export function TicketCard({ ticket, index, onClick }: Props) {
  const isDone = ticket.status === 'done'

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(ticket.id)}
          className={`cursor-pointer rounded-lg bg-white p-3 select-none transition-shadow duration-150 hover:shadow-[0px_16px_40px_rgba(12,14,16,0.07)] ${
            ticket.is_blocked ? 'border-l-[3px] border-[#fe8983]' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            boxShadow: snapshot.isDragging
              ? '0px 16px 40px rgba(12,14,16,0.10)'
              : '0px 12px 32px rgba(12,14,16,0.04)',
            opacity: snapshot.isDragging ? 0.95 : 1,
          }}
        >
          {ticket.is_blocked && <BlockedBadge className="mb-2" />}

          {/* Top row: priority badge + short_id */}
          <div className="mb-2 flex items-center justify-between gap-2">
            {isDone ? (
              <span className="inline-flex items-center rounded-full bg-[#69f6b8] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-[#00452d]">
                Done
              </span>
            ) : (
              <PriorityBadge priority={ticket.priority} />
            )}
            {ticket.short_id && (
              <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
                {ticket.short_id}
              </span>
            )}
          </div>

          {/* Title */}
          <p
            className={`mb-2 text-[0.875rem] font-medium leading-[1.6] ${
              isDone ? 'text-[#acb3b8] line-through' : 'text-[#0c0e10]'
            }`}
          >
            {ticket.title}
          </p>

          {/* Labels */}
          {ticket.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {ticket.labels.map((l) => (
                <LabelTag key={l.id} label={l} />
              ))}
            </div>
          )}

          {/* Footer: comment count + link icon + assignee */}
          <div className="flex items-center gap-3 text-[#acb3b8]">
            {/* Comment count */}
            <span className="flex items-center gap-1 text-[0.75rem]">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
              </svg>
              {ticket.comment_count ?? 0}
            </span>

            {/* Link icon (placeholder) */}
            <span className="flex items-center gap-1 text-[0.75rem]">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 10a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24L7 4.76" />
                <path d="M10 6a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24L9 11.24" />
              </svg>
              0
            </span>

            {/* Assignee(s) push right */}
            {ticket.assignees.length > 0 && (
              <div className="ml-auto flex -space-x-1">
                {ticket.assignees.slice(0, 3).map((u) => (
                  <AssigneeAvatar key={u.id} user={u} size="sm" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
