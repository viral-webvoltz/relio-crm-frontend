import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { AudiencePreview, Campaign, CampaignDetail, CampaignPayload, CampaignStatus, Recipient, Suppression } from '../types'

export type CampaignListParams = ListParams & { status: CampaignStatus | '' }

export async function getCampaigns({ search, status, ...rest }: CampaignListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Campaign>>('/campaigns', { signal, params: { ...rest, search: search || undefined, status: status || undefined } })
  return data
}

export async function getCampaign(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: CampaignDetail }>(`/campaigns/${id}`, { signal })
  return data.data
}

export async function createCampaign(payload: CampaignPayload, key: string) {
  const { data } = await httpClient.post<{ data: Campaign }>('/campaigns', payload, idempotent(key))
  return data.data
}

export async function updateCampaign(id: string, payload: CampaignPayload) {
  const { data } = await httpClient.patch<{ data: Campaign }>(`/campaigns/${id}`, payload)
  return data.data
}

export const deleteCampaign = (id: string) => httpClient.delete(`/campaigns/${id}`)

export async function duplicateCampaign(id: string, key: string) {
  const { data } = await httpClient.post<{ data: Campaign }>(`/campaigns/${id}/duplicate`, undefined, idempotent(key))
  return data.data
}

export async function getAudience(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: AudiencePreview }>(`/campaigns/${id}/audience`, { signal })
  return data.data
}

export const sendTest = (id: string, to: string) => httpClient.post(`/campaigns/${id}/test`, { to })
export const launchCampaign = (id: string, key: string) => httpClient.post(`/campaigns/${id}/launch`, undefined, idempotent(key))
export const scheduleCampaign = (id: string, at: string) => httpClient.post(`/campaigns/${id}/schedule`, { at })

/** `held` is how many emails were stopped before they went out (a scheduled campaign just goes back to draft: 0). */
export async function cancelCampaign(id: string) {
  const { data } = await httpClient.post<{ data: { held: number } }>(`/campaigns/${id}/cancel`)
  return data.data
}

export async function getRecipients(id: string, { page, limit }: { page: number; limit: number }, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Recipient>>(`/campaigns/${id}/recipients`, { signal, params: { page, limit } })
  return data
}

export async function getSuppressions({ page, limit }: { page: number; limit?: number }, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Suppression>>('/campaigns/suppressions', { signal, params: { page, limit } })
  return data
}
export const addSuppression = (email: string) => httpClient.post('/campaigns/suppressions', { email })
export const removeSuppression = (id: string) => httpClient.delete(`/campaigns/suppressions/${id}`)
