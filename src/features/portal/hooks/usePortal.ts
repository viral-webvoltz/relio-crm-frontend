import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/portalApi'
import type { ChangePasswordValues, PortalLoginValues } from '../schemas/portalSchema'

// Every portal query lives under ['portal'], so signing out can clear exactly the customer's data and nothing else.
export const portalMeKey = ['portal', 'me'] as const

// A 401 is the normal "not signed in" answer, not something to retry.
export const usePortalMe = () => useQuery({ queryKey: portalMeKey, queryFn: api.getPortalMe, retry: false, staleTime: 5 * 60_000 })

export function usePortalLogin() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, PortalLoginValues>({
    mutationFn: api.portalLogin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalMeKey }),
  })
}

export function usePortalChangePassword() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, ChangePasswordValues>({
    mutationFn: api.changePortalPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalMeKey }),
  })
}

export function usePortalLogout() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: api.portalLogout, onSuccess: () => queryClient.removeQueries({ queryKey: ['portal'] }) })
}

export const usePortalOrders = (page: number) =>
  useQuery({ queryKey: ['portal', 'orders', 'list', page], queryFn: () => api.getPortalOrders(page), placeholderData: keepPreviousData })

export const usePortalOrder = (id: string) => useQuery({ queryKey: ['portal', 'orders', 'detail', id], queryFn: () => api.getPortalOrder(id) })

export const usePortalTickets = (page: number) =>
  useQuery({ queryKey: ['portal', 'tickets', 'list', page], queryFn: () => api.getPortalTickets(page), placeholderData: keepPreviousData })

export const usePortalTicket = (id: string) => useQuery({ queryKey: ['portal', 'tickets', 'detail', id], queryFn: () => api.getPortalTicket(id) })

export function useCreatePortalTicket() {
  const queryClient = useQueryClient()
  return useMutation<{ data: { data: { id: string; ticketNumber: number } } }, ApiError, { subject: string; body: string }>({
    mutationFn: api.createPortalTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'tickets'] }),
  })
}

export function usePortalReply(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (body) => api.replyToPortalTicket(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'tickets'] }),
  })
}

export const usePortalInvoices = (page: number) =>
  useQuery({ queryKey: ['portal', 'invoices', 'list', page], queryFn: () => api.getPortalInvoices(page), placeholderData: keepPreviousData })

export const usePortalInvoice = (id: string) => useQuery({ queryKey: ['portal', 'invoices', 'detail', id], queryFn: () => api.getPortalInvoice(id) })
