import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { CreateSubscriptionPayload, UpdateSubscriptionPayload } from '../schemas/subscriptionSchema'
import type { RunNowResult, Subscription, SubscriptionDetail, SubscriptionRun } from '../types'

export type SubscriptionListParams = ListParams & { status: string }

export async function getSubscriptions({ search, status, ...rest }: SubscriptionListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Subscription>>('/subscriptions', { signal, params: { ...rest, search: search || undefined, status: status || undefined } })
  return data
}

export async function getSubscription(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: SubscriptionDetail }>(`/subscriptions/${id}`, { signal })
  return data.data
}

export async function getRuns(id: string, { page, limit }: { page: number; limit: number }, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<SubscriptionRun>>(`/subscriptions/${id}/runs`, { signal, params: { page, limit } })
  return data
}

export const createSubscription = (payload: CreateSubscriptionPayload, key?: string) => httpClient.post<{ data: Subscription }>('/subscriptions', payload, idempotent(key))
export const updateSubscription = (id: string, payload: UpdateSubscriptionPayload) => httpClient.patch<{ data: Subscription }>(`/subscriptions/${id}`, payload)
export const deleteSubscription = (id: string) => httpClient.delete(`/subscriptions/${id}`)

export type SubscriptionAction = 'pause' | 'resume' | 'cancel'
export const changeSubscription = (id: string, action: SubscriptionAction) => httpClient.post<{ data: Subscription }>(`/subscriptions/${id}/${action}`)

export async function runNow(id: string, key: string) {
  const { data } = await httpClient.post<{ data: RunNowResult }>(`/subscriptions/${id}/run`, undefined, idempotent(key))
  return data.data
}
