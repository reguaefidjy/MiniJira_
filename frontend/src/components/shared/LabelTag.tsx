interface Props {
  label: string
}

export function LabelTag({ label }: Props) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#e4e9ee] px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.05em] text-[#0c0e10]">
      {label}
    </span>
  )
}
