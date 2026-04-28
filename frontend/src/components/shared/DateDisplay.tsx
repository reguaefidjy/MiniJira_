import { formatDateTime } from '@/lib/utils'

interface Props {
  date: string
  label?: string
}

export function DateDisplay({ date, label }: Props) {
  return (
    <span className="text-xs text-[#acb3b8]">
      {label && <span className="mr-1">{label}</span>}
      {formatDateTime(date)}
    </span>
  )
}
