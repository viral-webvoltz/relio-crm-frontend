import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/ticketsApi'
import type { CreateTicketFormValues, MessageFormValues } from '../schemas/ticketSchema'

const ticketsKey = ['tickets'] as const

export const useTickets = (params: api.TicketListParams) =>
  useQuery({ queryKey: [...ticketsKey, 'list', params], queryFn: ({ signal }) => api.getTickets(params, signal), placeholderData: keepPreviousData })

export const useTicket = (id: string) => useQuery({ queryKey: [...ticketsKey, 'detail', id], queryFn: () => api.getTicket(id) })

// Ticket changes also move the dashboard's support numbers.
function useInvalidateTickets() {
  const queryClient = useQueryClient()
  return () => Promise.all([ticketsKey, ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function useCreateTicket() {
  const key = useIdempotencyKey()
  const invalidate = useInvalidateTickets()
  return useMutation<{ data: { data: { id: string; ticketNumber: number } } }, ApiError, CreateTicketFormValues>({ mutationFn: (values) => api.createTicket(values, key), onSuccess: invalidate })
}

export function useAddTicketMessage(id: string) {
  const invalidate = useInvalidateTickets()
  return useMutation<unknown, ApiError, MessageFormValues>({ mutationFn: (values) => api.addTicketMessage(id, values), onSuccess: invalidate })
}

export function useUpdateTicket(id: string) {
  const invalidate = useInvalidateTickets()
  return useMutation<unknown, ApiError, api.TicketChanges>({ mutationFn: (changes) => api.updateTicket(id, changes), onSuccess: invalidate })
}
