import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/rolesApi'
import type { RoleFormValues } from '../schemas/roleSchema'

const rolesKey = ['roles'] as const

export const useRoles = () => useQuery({ queryKey: rolesKey, queryFn: api.getRoles })

export function useSaveRole(id?: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, RoleFormValues>({
    mutationFn: (values) => (id ? api.updateRole(id, values) : api.createRole(values)),
    // Role changes alter what users may do, so the current user's permissions are stale too.
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: rolesKey }), queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })]),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey }),
  })
}
