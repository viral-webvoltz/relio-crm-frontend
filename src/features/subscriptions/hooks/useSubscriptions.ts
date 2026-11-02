import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import { usePrefetchNext } from '@/lib/usePrefetchNext'
import * as api from '../api/subscriptionsApi'
import type { CreateSubscriptionPayload, UpdateSubscriptionPayload } from '../schemas/subscriptionSchema'
import type { RunNowResult, Subscription } from '../types'

const subscriptionsKey = ['subscriptions'] as const

export const useSubscriptions = (params: api.SubscriptionListParams) => {
  const query = useQuery({ queryKey: [...subscriptionsKey, 'list', params], queryFn: ({ signal }) => api.getSubscriptions(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...subscriptionsKey, 'list'], params, query.data, api.getSubscriptions)
  return query
}

export const useSubscription = (id: string | undefined) =>
  useQuery({ queryKey: [...subscriptionsKey, 'detail', id], queryFn: ({ signal }) => api.getSubscription(id!, signal), enabled: Boolean(id) })

export const useRuns = (id: string, params: { page: number; limit: number }) =>
  useQuery({ queryKey: [...subscriptionsKey, 'runs', id, params], queryFn: ({ signal }) => api.getRuns(id, params, signal), placeholderData: keepPreviousData })

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: subscriptionsKey })
}

export function useCreateSubscription() {
  const key = useIdempotencyKey()
  const refresh = useRefresh()
  return useMutation<{ data: { data: Subscription } }, ApiError, CreateSubscriptionPayload>({ mutationFn: (payload) => api.createSubscription(payload, key), onSuccess: refresh })
}

export function useUpdateSubscription(id: string) {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, UpdateSubscriptionPayload>({ mutationFn: (payload) => api.updateSubscription(id, payload), onSuccess: refresh })
}

export function useDeleteSubscription() {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteSubscription, onSuccess: refresh })
}

export function useChangeSubscription() {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, { id: string; action: api.SubscriptionAction }>({ mutationFn: ({ id, action }) => api.changeSubscription(id, action), onSuccess: refresh })
}

// Billing now also creates an order and an invoice and moves product stock, so those lists refresh too.
// One key per confirmation: a double-click or a retry sends the same key, so the customer is not billed twice.
export function useRunNow(id: string, key: string) {
  const queryClient = useQueryClient()
  return useMutation<RunNowResult, ApiError, void>({
    mutationFn: () => api.runNow(id, key),
    onSuccess: () => Promise.all([subscriptionsKey, ['invoices'], ['orders'], ['products'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}
