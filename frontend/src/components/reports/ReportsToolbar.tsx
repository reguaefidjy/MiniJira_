import type { TicketStatus, User } from '@/types'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'todo',        label: 'Por hacer'   },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'review',      label: 'En revisión' },
  { value: 'done',        label: 'Listo'        },
]

interface Props {
  from:             string
  to:               string
  statusFilter:     TicketStatus[]
  assigneeFilter:   string | null
  users:            User[]
  onFromChange:     (v: string) => void
  onToChange:       (v: string) => void
  onStatusChange:   (v: TicketStatus[]) => void
  onAssigneeChange: (v: string | null) => void
  onExport:         () => void
}

export function ReportsToolbar({
  from,
  to,
  statusFilter,
  assigneeFilter,
  users,
  onFromChange,
  onToChange,
  onStatusChange,
  onAssigneeChange,
  onExport,
}: Props) {
  function toggleStatus(s: TicketStatus) {
    onStatusChange(
      statusFilter.includes(s)
        ? statusFilter.filter((x) => x !== s)
        : [...statusFilter, s],
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-[#e4e9ee]/50 bg-white px-6 py-4">
      {/* Fechas */}
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#acb3b8]">Desde</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => onFromChange(e.target.value)}
            className="rounded-lg bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#acb3b8]">Hasta</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => onToChange(e.target.value)}
            className="rounded-lg bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
          />
        </label>
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[#acb3b8]">Estado</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleStatus(value)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                statusFilter.includes(value)
                  ? { background: 'linear-gradient(145deg, #005bbf, #0050a8)', color: '#ffffff' }
                  : { backgroundColor: '#f2f4f6', color: '#0c0e10' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asignado */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[#acb3b8]">Asignado</span>
        <select
          value={assigneeFilter ?? ''}
          onChange={(e) => onAssigneeChange(e.target.value || null)}
          className="rounded-lg bg-[#f2f4f6] px-3 py-2 text-sm text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
        >
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Exportar */}
      <div className="ml-auto self-end">
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
        >
          Exportar CSV
        </button>
      </div>
    </div>
  )
}
