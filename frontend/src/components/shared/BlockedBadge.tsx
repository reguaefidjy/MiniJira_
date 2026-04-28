import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function BlockedBadge({ className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-[#fe8983] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-[#752121]',
        className,
      )}
    >
      Bloqueado
    </span>
  )
}
