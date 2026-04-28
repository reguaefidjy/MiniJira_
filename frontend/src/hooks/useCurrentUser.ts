import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/auth'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: Infinity,
    refetchInterval: false,
    retry: false,
  })
}
