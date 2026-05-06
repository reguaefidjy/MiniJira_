import type { TicketPriority } from '@/types'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja'  },
]

interface Props {
  priorityFilter:           TicketPriority[]
  assigneeFilter:           string | null
  labelFilter:              string | null
  includeInProgress:        boolean
  onPriorityChange:         (v: TicketPriority[]) => void
  onAssigneeChange:         (v: string | null) => void
  onLabelChange:            (v: string | null) => void
  onIncludeInProgressChange:(v: boolean) => void
  onClear:                  () => void
  hasFilters:               boolean
}

export function BacklogToolbar({
  priorityFilter,
  assigneeFilter,
  labelFilter,
  includeInProgress,
  onPriorityChange,
  onAssigneeChange,
  onLabelChange,
  onIncludeInProgressChange,
  onClear,
  hasFilters,
}: Props) {
  const { data: users  = [] } = useUsers()
  const { data: labels = [] } = useLabels()

  function togglePriority(p: TicketPriority) {
    onPriorityChange(
      priorityFilter.includes(p)
        ? priorityFilter.filter((x) => x !== p)
        : [...priorityFilter, p],
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e4e9ee]/50 bg-white px-6 py-3">
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
          <option value="">Todos los miembros</option>
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

      {/* Incluir En progreso */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#0c0e10]">
        <input
          type="checkbox"
          checked={includeInProgress}
          onChange={(e) => onIncludeInProgressChange(e.target.checked)}
          className="accent-[#005bbf]"
        />
        Incluir En progreso
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
