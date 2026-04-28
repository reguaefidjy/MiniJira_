import { useTickets } from '@/hooks/useTickets'
import { useAppStore } from '@/store/useAppStore'
import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatar'
import type { User } from '@/types'

export function BoardHeader() {
  const boardFilters = useAppStore((s) => s.boardFilters)
  const { data: tickets = [] } = useTickets(boardFilters)

  const uniqueAssignees = tickets
    .flatMap((t) => t.assignees)
    .reduce<User[]>((acc, u) => {
      if (!acc.find((a) => a.id === u.id)) acc.push(u)
      return acc
    }, [])

  return (
    <div className="flex-shrink-0 px-6 pt-6 pb-4">
      {/* Breadcrumb */}
      <p className="mb-1 text-[0.6875rem] uppercase tracking-[0.05em] text-[#acb3b8]">
        Projects &rsaquo; Alpha
      </p>

      {/* Title row */}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[2.75rem] font-semibold leading-none tracking-[-0.02em] text-[#0c0e10]">
          Sprint Board
        </h1>

        <div className="flex items-center gap-3 pb-1">
          {uniqueAssignees.length > 0 && (
            <AssigneeAvatarStack users={uniqueAssignees} max={4} />
          )}

          <button className="flex items-center gap-1.5 rounded-md border border-[#acb3b8]/20 px-3 py-1.5 text-sm text-[#005bbf] transition-colors hover:bg-[#f2f4f6]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="4" y1="8" x2="12" y2="8" />
              <line x1="6" y1="12" x2="10" y2="12" />
            </svg>
            Filter
          </button>

          <button className="flex items-center gap-1.5 rounded-md border border-[#acb3b8]/20 px-3 py-1.5 text-sm text-[#005bbf] transition-colors hover:bg-[#f2f4f6]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2" />
              <circle cx="4" cy="8" r="2" />
              <circle cx="12" cy="12" r="2" />
              <line x1="6" y1="8" x2="10" y2="4.8" />
              <line x1="6" y1="8" x2="10" y2="11.2" />
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  )
}
