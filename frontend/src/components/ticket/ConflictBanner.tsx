import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  ticketId: string
}

export function ConflictBanner({ ticketId }: Props) {
  const queryClient = useQueryClient()
  const setConflictPayload = useAppStore((s) => s.setConflictPayload)

  function handleReload() {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    setConflictPayload(null)
  }

  return (
    <div className="rounded-lg bg-[#fe8983]/20 px-4 py-3 text-sm text-[#752121]">
      <p>Alguien modificó este ticket mientras lo editabas.</p>
      <button
        onClick={handleReload}
        className="mt-1 font-medium underline hover:no-underline"
      >
        Recargar para ver los cambios
      </button>
      <span className="ml-1 text-xs">(tus cambios se mantienen visibles)</span>
    </div>
  )
}
