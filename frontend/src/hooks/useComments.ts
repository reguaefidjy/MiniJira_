import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addComment, archiveComment, fetchComments } from '@/api/comments'

export function useComments(ticketId: string | null) {
  return useQuery({
    queryKey: ['comments', ticketId],
    queryFn: () => fetchComments(ticketId!),
    enabled: !!ticketId,
  })
}

export function useAddComment(ticketId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => addComment(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
    },
  })
}

export function useArchiveComment(ticketId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => archiveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
    },
  })
}
