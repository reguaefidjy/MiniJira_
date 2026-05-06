import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCreateUser, adminDeactivateUser, adminUpdateUser } from '@/api/admin'
import type { UserRole } from '@/types'

export function useAdminCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; email: string; role: UserRole }) =>
      adminCreateUser(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; email?: string; role?: UserRole }
    }) => adminUpdateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useAdminDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminDeactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
