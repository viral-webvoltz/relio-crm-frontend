import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListParams } from '@/lib/apiTypes'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/webhooksApi'
import type { CreatedWebhook } from '../types'

const webhooksKey = ['webhooks'] as const

export const useWebhooks = () => useQuery({ queryKey: [...webhooksKey, 'list'], queryFn: ({ signal }) => api.getWebhooks(signal) })

export const useDeliveries = (id: string | undefined, params: Pick<ListParams, 'page' | 'limit'>) =>
  useQuery({
    queryKey: [...webhooksKey, 'deliveries', id, params],
    queryFn: ({ signal }) => api.getDeliveries(id!, params, signal),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    // Deliveries are sent by a background worker, so keep the list fresh while someone is watching it.
    refetchInterval: 10_000,
  })

export function useSaveWebhook(id?: string) {
  const queryClient = useQueryClient()
  return useMutation<CreatedWebhook | undefined, ApiError, api.WebhookPayload>({
    mutationFn: async (payload) => {
      if (id) {
        await api.updateWebhook(id, payload)
        return undefined
      }
      return api.createWebhook(payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksKey }),
  })
}

export function useToggleWebhook() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => api.updateWebhook(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksKey }),
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteWebhook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksKey }),
  })
}

export function useSendTestEvent() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.sendTestEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...webhooksKey, 'deliveries'] }),
  })
}
