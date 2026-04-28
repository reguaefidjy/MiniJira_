import { cn } from '@/lib/utils'
import type { TicketPriority } from '@/types'

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'bg-[#f2f4f6] text-[#acb3b8]',
  medium: 'bg-[#fff3cd] text-[#7a5400]',
  high: 'bg-[#fe8983] text-[#752121]',
}

interface Props {
  priority: TicketPriority
  className?: string
}

export function PriorityBadge({ priority, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em]',
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
