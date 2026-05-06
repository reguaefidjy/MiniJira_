import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTicket } from '@/api/tickets'
import { useAppStore } from '@/store/useAppStore'
import type { Ticket, TicketFormValues } from '@/types'

interface UpdateTicketArgs {
  id: string
  data: Partial<TicketFormValues>
}

type TicketsSnapshot = [unknown[], Ticket[] | undefined][]

interface MutationContext {
  previousTicketsSnapshots: TicketsSnapshot
  previousTicket: Ticket | undefined
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  const setConflictPayload = useAppStore((s) => s.setConflictPayload)

  return useMutation({
    mutationFn: ({ id, data }: UpdateTicketArgs) => updateTicket(id, data),

    onMutate: async ({ id, data }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] })
      await queryClient.cancelQueries({ queryKey: ['ticket', id] })

      const previousTicketsSnapshots = queryClient.getQueriesData<Ticket[]>({
        queryKey: ['tickets'],
      }) as TicketsSnapshot

      const previousTicket = queryClient.getQueryData<Ticket>(['ticket', id])

      // Aplica solo los campos primitivos que el Ticket tiene directamente
      const { version: _v, assignee_ids: _a, label_ids: _l, ...safeFields } = data

      queryClient.setQueriesData<Ticket[]>({ queryKey: ['tickets'] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...safeFields } : t)) ?? old,
      )

      if (previousTicket) {
        queryClient.setQueryData<Ticket>(['ticket', id], { ...previousTicket, ...safeFields })
      }

      return { previousTicketsSnapshots, previousTicket }
    },

    onError: (
      error: Error & { status?: number },
      { id, data },
      ctx: MutationContext | undefined,
    ) => {
      ctx?.previousTicketsSnapshots.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData(queryKey, snapshot)
      })

      if (ctx?.previousTicket) {
        queryClient.setQueryData(['ticket', id], ctx.previousTicket)
      }

      if (error.status === 409) {
        setConflictPayload(data as TicketFormValues)
      }
    },

    onSuccess: () => {
      setConflictPayload(null)
    },

    onSettled: (_ticket, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
