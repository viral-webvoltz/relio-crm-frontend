import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ConvertResult, PublicQuote, Quote, QuoteDetail, SendResult } from '../types'
import type { QuotePayload } from '../schemas/quoteSchema'

export type QuoteListParams = ListParams & { status: string }

export async function getQuotes({ search, status, ...rest }: QuoteListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Quote>>('/quotes', { signal, params: { ...rest, search: search || undefined, status: status || undefined } })
  return data
}

export async function getQuote(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: QuoteDetail }>(`/quotes/${id}`, { signal })
  return data.data
}

export const createQuote = (payload: QuotePayload, key?: string) => httpClient.post<{ data: Quote }>('/quotes', payload, idempotent(key))
export const updateQuote = (id: string, payload: QuotePayload) => httpClient.patch<{ data: Quote }>(`/quotes/${id}`, payload)
export const deleteQuote = (id: string) => httpClient.delete(`/quotes/${id}`)

export async function sendQuote(id: string, to: string | undefined, key: string) {
  const { data } = await httpClient.post<{ data: SendResult }>(`/quotes/${id}/send`, to ? { to } : {}, idempotent(key))
  return data.data
}

export async function convertQuote(id: string, target: 'order' | 'invoice', dueDate: string | null, key: string) {
  const { data } = await httpClient.post<{ data: ConvertResult }>(`/quotes/${id}/convert`, { target, ...(target === 'invoice' && dueDate && { dueDate }) }, idempotent(key))
  return data.data
}

// ---- the customer link: no session, the token in the path is the credential ----

export async function getPublicQuote(token: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: PublicQuote }>(`/public/quotes/${token}`, { signal })
  return data.data
}

export async function respondToQuote(token: string, answer: { accept: true; name: string; note: string } | { accept: false; note: string }) {
  const note = answer.note.trim() || undefined
  const { data } = await httpClient.post<{ data: PublicQuote }>(
    `/public/quotes/${token}/${answer.accept ? 'accept' : 'reject'}`,
    answer.accept ? { name: answer.name.trim(), ...(note && { note }) } : { ...(note && { note }) },
  )
  return data.data
}

// ---- pickers (searchable, server side) ----

export type ProductChoice = { id: string; name: string; sku: string | null; priceMinor: number; currency: string; isActive: boolean }

export async function searchProducts(search: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ProductChoice[] }>('/products', { signal, params: { search: search || undefined, status: 'active', limit: 20, page: 1 } })
  return data.data
}

export async function getProductChoice(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ProductChoice }>(`/products/${id}`, { signal })
  return data.data
}

export async function searchDeals(search: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: { id: string; title: string }[] }>('/deals', { signal, params: { search: search || undefined, limit: 20, page: 1 } })
  return data.data
}

export async function getDealChoice(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: { id: string; title: string } }>(`/deals/${id}`, { signal })
  return data.data
}
