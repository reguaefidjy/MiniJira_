import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '@/api/tickets'
import type { BoardFilters } from '@/types'

export function useTickets(filters: BoardFilters) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => fetchTickets(filters),
  })
}
