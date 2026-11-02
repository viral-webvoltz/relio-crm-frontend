import { httpClient } from '@/lib/httpClient'

export type PortalAccount = { id: string; email: string; isActive: boolean; lastLoginAt: string | null; createdAt: string }
export type PortalAccountInfo = { account: PortalAccount | null; organizationSlug: string }

export async function getPortalAccount(contactId: string) {
  const { data } = await httpClient.get<{ data: PortalAccountInfo }>(`/customers/${contactId}/account`)
  return data.data
}

export const createPortalAccount = (contactId: string, values: { email: string; password: string }) => httpClient.post(`/customers/${contactId}/account`, values)
export const updatePortalAccount = (contactId: string, values: { email?: string; password?: string; isActive?: boolean }) =>
  httpClient.patch(`/customers/${contactId}/account`, values)
