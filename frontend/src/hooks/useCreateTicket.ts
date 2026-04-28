import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTicket } from '@/api/tickets'
import type { TicketFormValues } from '@/types'

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<TicketFormValues, 'version' | 'status'>) => createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
