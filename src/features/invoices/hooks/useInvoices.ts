import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/invoicesApi'
import type { PaymentFormValues, RefundFormValues } from '../schemas/invoiceSchema'

const invoicesKey = ['invoices'] as const

export const useInvoices = (params: api.InvoiceListParams, enabled = true) => {
  const query = useQuery({ queryKey: [...invoicesKey, 'list', params], queryFn: ({ signal }) => api.getInvoices(params, signal), placeholderData: keepPreviousData, enabled })
  usePrefetchNext([...invoicesKey, 'list'], params, query.data, api.getInvoices)
  return query
}

export const useInvoice = (id: string | undefined) =>
  useQuery({ queryKey: [...invoicesKey, 'detail', id], queryFn: () => api.getInvoice(id!), enabled: Boolean(id) })

// Invoice money movements change the invoice, its list row, the order screen's invoice box and the dashboard.
function useInvalidateInvoiceEffects() {
  const queryClient = useQueryClient()
  return () => Promise.all([invoicesKey, ['orders'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function useCreateInvoice() {
  const invalidate = useInvalidateInvoiceEffects()
  return useMutation({ mutationFn: api.createInvoice, onSuccess: invalidate })
}

export function useVoidInvoice(id: string) {
  const invalidate = useInvalidateInvoiceEffects()
  return useMutation<unknown, ApiError, void>({ mutationFn: () => api.voidInvoice(id), onSuccess: invalidate })
}

export function useRecordPayment(invoiceId: string) {
  const invalidate = useInvalidateInvoiceEffects()
  return useMutation<unknown, ApiError, { values: PaymentFormValues; idempotencyKey: string }>({
    mutationFn: ({ values, idempotencyKey }) => api.recordPayment(invoiceId, values, idempotencyKey),
    onSuccess: invalidate,
  })
}

export function useRefundPayment() {
  const invalidate = useInvalidateInvoiceEffects()
  return useMutation<unknown, ApiError, { paymentId: string; values: RefundFormValues }>({
    mutationFn: ({ paymentId, values }) => api.refundPayment(paymentId, values),
    onSuccess: invalidate,
  })
}
