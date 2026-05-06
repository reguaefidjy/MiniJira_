import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/api/labels'

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLabel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      updateLabel(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
