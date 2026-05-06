import type { TicketPriority, TicketStatus } from '@/types'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'todo',        label: 'Por hacer'   },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'review',      label: 'Review'       },
  { value: 'done',        label: 'Listo'        },
]

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja'  },
]

interface Props {
  statusFilter:          TicketStatus[]
  priorityFilter:        TicketPriority[]
  assigneeFilter:        string | null
  labelFilter:           string | null
  createdAtFrom:         string | null
  createdAtTo:           string | null
  onStatusChange:        (v: TicketStatus[]) => void
  onPriorityChange:      (v: TicketPriority[]) => void
  onAssigneeChange:      (v: string | null) => void
  onLabelChange:         (v: string | null) => void
  onCreatedAtFromChange: (v: string | null) => void
  onCreatedAtToChange:   (v: string | null) => void
  onClear:               () => void
  hasFilters:            boolean
}

export function IssuesToolbar({
  statusFilter,
  priorityFilter,
  assigneeFilter,
  labelFilter,
  createdAtFrom,
  createdAtTo,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onLabelChange,
  onCreatedAtFromChange,
  onCreatedAtToChange,
  onClear,
  hasFilters,
}: Props) {
  const { data: users  = [] } = useUsers()
  const { data: labels = [] } = useLabels()

  function toggleStatus(s: TicketStatus) {
    onStatusChange(
      statusFilter.includes(s)
        ? statusFilter.filter((x) => x !== s)
        : [...statusFilter, s],
    )
  }

  function togglePriority(p: TicketPriority) {
    onPriorityChange(
      priorityFilter.includes(p)
        ? priorityFilter.filter((x) => x !== p)
        : [...priorityFilter, p],
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e4e9ee]/50 bg-white px-6 py-3">
      {/* Estado — checkboxes */}
      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-1 text-xs text-[#0c0e10]">
            <input
              type="checkbox"
              checked={statusFilter.includes(value)}
              onChange={() => toggleStatus(value)}
              className="accent-[#005bbf]"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="h-4 w-px bg-[#e4e9ee]" />

      {/* Prioridad — toggle buttons */}
      <div className="flex gap-1">
        {PRIORITIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => togglePriority(value)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={
              priorityFilter.includes(value)
                ? { background: 'linear-gradient(145deg, #005bbf, #0050a8)', color: '#ffffff' }
                : { backgroundColor: '#f2f4f6', color: '#0c0e10' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Asignado */}
      {users.length > 0 && (
        <select
          value={assigneeFilter ?? ''}
          onChange={(e) => onAssigneeChange(e.target.value || null)}
          className="rounded-md bg-[#f2f4f6] px-2.5 py-1 text-xs text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
        >
          <option value="">Todos los asignados</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      )}

      {/* Etiqueta */}
      {labels.length > 0 && (
        <select
          value={labelFilter ?? ''}
          onChange={(e) => onLabelChange(e.target.value || null)}
          className="rounded-md bg-[#f2f4f6] px-2.5 py-1 text-xs text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
        >
          <option value="">Todas las etiquetas</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      )}

      {/* Fechas */}
      <label className="flex items-center gap-1 text-xs text-[#acb3b8]">
        Desde
        <input
          type="date"
          value={createdAtFrom ?? ''}
          max={createdAtTo ?? undefined}
          onChange={(e) => onCreatedAtFromChange(e.target.value || null)}
          className="w-36 rounded-md bg-[#f2f4f6] px-2 py-1 text-xs text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-[#acb3b8]">
        Hasta
        <input
          type="date"
          value={createdAtTo ?? ''}
          min={createdAtFrom ?? undefined}
          onChange={(e) => onCreatedAtToChange(e.target.value || null)}
          className="w-36 rounded-md bg-[#f2f4f6] px-2 py-1 text-xs text-[#0c0e10] focus:outline-none focus:ring-2 focus:ring-[#005bbf]"
        />
      </label>

      {/* Limpiar */}
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-[#005bbf] hover:underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
