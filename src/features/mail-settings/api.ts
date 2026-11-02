import { httpClient } from '@/lib/httpClient'

export type MailAccount = {
  id: string
  fromEmail: string
  fromName: string | null
  clientId: string
  /** The one emails are sent from right now. */
  isActive: boolean
  /** When the inbox was last read for replies, and why that is not working (if it is not). */
  lastSyncedAt: string | null
  syncError: string | null
  createdAt: string
  updatedAt: string
}

export type MailSettings = {
  /** Where outgoing email goes from: an active Gmail account of this organization, the server's default, or nowhere yet. */
  source: 'organization' | 'server' | 'none'
  accounts: MailAccount[]
}

// The secrets are never sent back, so on edit a blank value means "keep the saved one".
export type MailAccountInput = {
  fromEmail: string
  fromName: string
  clientId: string
  clientSecret: string
  refreshToken: string
}

export async function getMailSettings(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: MailSettings }>('/organization/mail', { signal })
  return data.data
}

export const createMailAccount = (values: MailAccountInput) => httpClient.post('/organization/mail', values)

export const updateMailAccount = (id: string, values: MailAccountInput) => httpClient.put(`/organization/mail/${id}`, values)

export const activateMailAccount = (id: string) => httpClient.post(`/organization/mail/${id}/activate`)

export const removeMailAccount = (id: string) => httpClient.delete(`/organization/mail/${id}`)

export async function testMailAccount(id: string) {
  const { data } = await httpClient.post<{ message: string }>(`/organization/mail/${id}/test`, {})
  return data.message
}
