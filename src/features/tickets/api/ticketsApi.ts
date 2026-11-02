import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import type { CreateTicketFormValues, MessageFormValues } from '../schemas/ticketSchema'
import type { SlaPolicy, SlaPolicyPayload, SlaSummary, Ticket, TicketDetail, TicketPriority, TicketStatus } from '../types'

export type TicketListParams = ListParams & { status: string; priority: string; assignee: string; sla: string }

export async function getTickets({ search, status, priority, assignee, sla, ...rest }: TicketListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Ticket>>('/tickets', { signal,
    params: { ...rest, search: search || undefined, status: status || undefined, priority: priority || undefined, assignee: assignee || undefined, sla: sla || undefined },
  })
  return data
}

export async function getTicket(id: string) {
  const { data } = await httpClient.get<{ data: TicketDetail }>(`/tickets/${id}`)
  return data.data
}

export const createTicket = ({ contactId, assignedTo, ...values }: CreateTicketFormValues, key?: string) =>
  httpClient.post<{ data: Ticket }>('/tickets', { ...values, contactId: contactId || null, assignedTo: assignedTo || null }, idempotent(key))

export const addTicketMessage = (id: string, values: MessageFormValues) => httpClient.post(`/tickets/${id}/messages`, values)

export type TicketChanges = { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string | null }
export const updateTicket = (id: string, changes: TicketChanges) => httpClient.patch(`/tickets/${id}`, changes)

export async function getSlaPolicy(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: SlaPolicy }>('/tickets/sla/policy', { signal })
  return data.data
}

export async function putSlaPolicy(payload: SlaPolicyPayload) {
  const { data } = await httpClient.put<{ data: SlaPolicy }>('/tickets/sla/policy', payload)
  return data.data
}

export async function getSlaSummary(days: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: SlaSummary }>('/tickets/sla/summary', { signal, params: { days } })
  return data.data
}
