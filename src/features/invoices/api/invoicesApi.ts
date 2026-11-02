import { httpClient } from '@/lib/httpClient'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import { toMinor } from '@/lib/money'
import type { PaymentFormValues, RefundFormValues } from '../schemas/invoiceSchema'
import type { Invoice, InvoiceDetail } from '../types'

export type InvoiceListParams = ListParams & { status: string; orderId?: string }

export async function getInvoices({ search, status, ...rest }: InvoiceListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Invoice>>('/invoices', { signal,
    params: { ...rest, search: search || undefined, status: status || undefined },
  })
  return data
}

export async function getInvoice(id: string) {
  const { data } = await httpClient.get<{ data: InvoiceDetail }>(`/invoices/${id}`)
  return data.data
}

export const createInvoice = (orderId: string) => httpClient.post<{ data: Invoice }>('/invoices', { orderId })
export const voidInvoice = (id: string) => httpClient.post(`/invoices/${id}/void`)

// The idempotency key is generated once per payment form, so a retry or double click is recognised server-side.
export const recordPayment = (invoiceId: string, { amount, method, reference }: PaymentFormValues, idempotencyKey: string) =>
  httpClient.post(`/invoices/${invoiceId}/payments`, { amountMinor: toMinor(amount), method, reference, idempotencyKey })

export const refundPayment = (paymentId: string, { amount, reason }: RefundFormValues) =>
  httpClient.post(`/payments/${paymentId}/refunds`, { amountMinor: toMinor(amount), reason })
