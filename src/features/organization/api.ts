import { httpClient } from '@/lib/httpClient'

export type Organization = { id: string; name: string; slug: string; timezone: string; createdAt: string; memberCount: number }

export async function getOrganization(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Organization }>('/organization', { signal })
  return data.data
}

export async function updateOrganization(values: { name: string; timezone: string }) {
  const { data } = await httpClient.patch<{ data: Organization }>('/organization', values)
  return data.data
}
