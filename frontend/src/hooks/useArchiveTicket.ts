import { useMutation, useQueryClient } from '@tanstack/react-query'
import { archiveTicket } from '@/api/tickets'
import { useAppStore } from '@/store/useAppStore'

export function useArchiveTicket() {
  const queryClient = useQueryClient()
  const setActiveTicketId = useAppStore((s) => s.setActiveTicketId)

  return useMutation({
    mutationFn: (id: string) => archiveTicket(id),
    onSuccess: () => {
      setActiveTicketId(null)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
