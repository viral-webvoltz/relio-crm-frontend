import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/customersApi'

const accountKey = (contactId: string) => ['customers', contactId, 'account'] as const

export const usePortalAccount = (contactId: string, enabled: boolean) =>
  useQuery({ queryKey: accountKey(contactId), queryFn: () => api.getPortalAccount(contactId), enabled })

export function useCreatePortalAccount(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { email: string; password: string }>({
    mutationFn: (values) => api.createPortalAccount(contactId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKey(contactId) }),
  })
}

export function useUpdatePortalAccount(contactId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { email?: string; password?: string; isActive?: boolean }>({
    mutationFn: (values) => api.updatePortalAccount(contactId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKey(contactId) }),
  })
}
