import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import type { Lead } from '../types'
import type { LeadFormValues } from '../schemas/leadSchema'

export type LeadListParams = ListParams & { status: string }

// Users without leads.assign must not send assignedTo at all (the API rejects it), so it is opt-in.
export type LeadSubmit = LeadFormValues & { canAssign: boolean }

const toPayload = ({ canAssign, assignedTo, ...values }: LeadSubmit) => ({
  ...values,
  score: Number(values.score),
  ...(canAssign && { assignedTo: assignedTo || null }),
})

export async function getLeads({ search, status, ...rest }: LeadListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Lead>>('/leads', { signal, params: { ...rest, search: search || undefined, status: status || undefined } })
  return data
}

export async function getLead(id: string) {
  const { data } = await httpClient.get<{ data: Lead }>(`/leads/${id}`)
  return data.data
}

export const createLead = (values: LeadSubmit, key?: string) => httpClient.post('/leads', toPayload(values), idempotent(key))
export const updateLead = (id: string, values: LeadSubmit) => httpClient.patch(`/leads/${id}`, toPayload(values))
export const deleteLead = (id: string) => httpClient.delete(`/leads/${id}`)
export const convertLead = (id: string) => httpClient.post(`/leads/${id}/convert`)
