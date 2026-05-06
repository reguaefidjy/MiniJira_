import type { Label } from '@/types'

interface Props {
  label: Label
}


export function LabelTag({ label }: Props) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.05em]"
      style={{
        backgroundColor: label.color + '22', // color al ~13% opacidad
        color: label.color,
        border: `1px solid ${label.color}44`,
      }}
    >
      {label.name}
    </span>
  )
}
