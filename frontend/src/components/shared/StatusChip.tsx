import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/types'

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  todo: 'bg-[#f2f4f6] text-[#0c0e10]',
  in_progress: 'bg-[#d7e2ff] text-[#003d84]',
  review: 'bg-[#fff3cd] text-[#7a5400]',
  done: 'bg-[#69f6b8] text-[#00452d]',
}

interface Props {
  status: TicketStatus
  className?: string
}

export function StatusChip({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em]',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
