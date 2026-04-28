import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTicket } from '@/api/tickets'
import { useAppStore } from '@/store/useAppStore'
import type { TicketFormValues } from '@/types'

interface UpdateTicketArgs {
  id: string
  data: Partial<TicketFormValues>
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  const setConflictPayload = useAppStore((s) => s.setConflictPayload)

  return useMutation({
    mutationFn: ({ id, data }: UpdateTicketArgs) => updateTicket(id, data),
    onSuccess: (_ticket, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setConflictPayload(null)
    },
    onError: (error: Error & { status?: number }, { data }) => {
      if (error.status === 409) {
        setConflictPayload(data as TicketFormValues)
      }
    },
  })
}
