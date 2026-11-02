import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import type { CreatedWebhook, WebhookDelivery, WebhookEndpoint } from '../types'

export async function getWebhooks(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: WebhookEndpoint[] }>('/webhooks', { signal })
  return data.data
}

export type WebhookPayload = { url: string; events: string[] }

export async function createWebhook(payload: WebhookPayload) {
  const { data } = await httpClient.post<{ data: CreatedWebhook }>('/webhooks', payload)
  return data.data
}

export const updateWebhook = (id: string, changes: Partial<WebhookPayload> & { isActive?: boolean }) => httpClient.patch(`/webhooks/${id}`, changes)
export const deleteWebhook = (id: string) => httpClient.delete(`/webhooks/${id}`)
export const sendTestEvent = (id: string) => httpClient.post(`/webhooks/${id}/test`)

export async function getDeliveries(id: string, { page, limit }: Pick<ListParams, 'page' | 'limit'>, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<WebhookDelivery>>(`/webhooks/${id}/deliveries`, { signal, params: { page, limit } })
  return data
}
