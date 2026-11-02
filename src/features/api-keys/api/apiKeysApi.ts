import { httpClient } from '@/lib/httpClient'
import type { ApiKey, CreateApiKeyPayload, CreatedApiKey } from '../types'

export async function getApiKeys(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ApiKey[] }>('/api-keys', { signal })
  return data.data
}

/** The scopes this person may put on a key (what they can do themselves, never the management rights). */
export async function getScopes(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: string[] }>('/api-keys/scopes', { signal })
  return data.data
}

export async function createApiKey(payload: CreateApiKeyPayload) {
  const { data } = await httpClient.post<{ data: CreatedApiKey }>('/api-keys', payload)
  return data.data
}

export const revokeApiKey = (id: string) => httpClient.delete(`/api-keys/${id}`)
