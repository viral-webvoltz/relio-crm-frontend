import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import type { Contact } from '../types'
import type { ContactFormValues } from '../schemas/contactSchema'

// The API expects a null, not an empty string, for "no company".
// Tags are saved with their own request, so they are not part of the contact payload.
const toPayload = ({ tagIds: _tagIds, ...values }: ContactFormValues) => ({ ...values, companyId: values.companyId || null })

export async function getContacts(params: ListParams & { limit?: number }, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Contact>>('/contacts', { signal, params: { ...params, search: params.search || undefined } })
  return data
}

export async function getContact(id: string) {
  const { data } = await httpClient.get<{ data: Contact }>(`/contacts/${id}`)
  return data.data
}

export const createContact = (values: ContactFormValues, key?: string) => httpClient.post('/contacts', toPayload(values), idempotent(key))
export const updateContact = (id: string, values: ContactFormValues) => httpClient.patch(`/contacts/${id}`, toPayload(values))
export const deleteContact = (id: string) => httpClient.delete(`/contacts/${id}`)
