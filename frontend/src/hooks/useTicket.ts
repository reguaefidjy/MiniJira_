import { useQuery } from '@tanstack/react-query'
import { fetchTicket } from '@/api/tickets'

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  })
}
