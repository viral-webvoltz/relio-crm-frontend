import { httpClient } from '@/lib/httpClient'

export type AccessLink = { id: string; expiresAt: string; createdAt: string; createdByName: string }
/** Returned once by POST /access-links; `token` is the secret and goes in the shared URL. */
export type CreatedAccessLink = { id: string; token: string; expiresAt: string }

export async function getAccessLinks(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: AccessLink[] }>('/access-links', { signal })
  return data.data
}
export async function createAccessLink(expiresInMinutes: number) {
  const { data } = await httpClient.post<{ data: CreatedAccessLink }>('/access-links', { expiresInMinutes })
  return data.data
}
export const revokeAccessLink = (id: string) => httpClient.delete(`/access-links/${id}`)
export const redeemAccessLink = (token: string) => httpClient.post('/access-links/redeem', { token })
