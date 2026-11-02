import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/usersApi'
import type { CreateUserFormValues, EditUserFormValues } from '../schemas/userSchema'

const usersKey = ['users'] as const

export const useUsers = () => useQuery({ queryKey: [...usersKey, 'list'], queryFn: api.getUsers })

export const useUserOptions = (enabled = true) =>
  useQuery({ queryKey: [...usersKey, 'options'], queryFn: api.getUserOptions, enabled })

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, CreateUserFormValues>({
    mutationFn: api.createUser,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: usersKey }), queryClient.invalidateQueries({ queryKey: ['roles'] })]),
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, EditUserFormValues>({
    mutationFn: (values) => api.updateUser(id, values),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: usersKey }), queryClient.invalidateQueries({ queryKey: ['roles'] })]),
  })
}
