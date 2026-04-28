import { useAppStore } from '@/store/useAppStore'

export function BoardToolbar() {
  const { boardFilters, resetBoardFilters } = useAppStore()

  const hasFilters =
    boardFilters.status.length > 0 ||
    boardFilters.priority.length > 0 ||
    boardFilters.assignee_id !== null ||
    boardFilters.labels.length > 0 ||
    boardFilters.created_at_from !== null

  return (
    <div className="flex items-center justify-between border-b border-[#e4e9ee]/50 bg-white px-4 py-3">
      <h1 className="text-lg font-semibold tracking-[-0.02em] text-[#0c0e10]">
        Tablero
      </h1>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <button
            onClick={resetBoardFilters}
            className="text-xs text-[#005bbf] hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
