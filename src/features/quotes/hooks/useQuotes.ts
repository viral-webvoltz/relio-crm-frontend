import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import { usePrefetchNext } from '@/lib/usePrefetchNext'
import * as api from '../api/quotesApi'
import type { QuotePayload } from '../schemas/quoteSchema'
import type { ConvertResult, PublicQuote, Quote, SendResult } from '../types'

const quotesKey = ['quotes'] as const

export const useQuotes = (params: api.QuoteListParams) => {
  const query = useQuery({ queryKey: [...quotesKey, 'list', params], queryFn: ({ signal }) => api.getQuotes(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...quotesKey, 'list'], params, query.data, api.getQuotes)
  return query
}

export const useQuote = (id: string | undefined) => useQuery({ queryKey: [...quotesKey, 'detail', id], queryFn: ({ signal }) => api.getQuote(id!, signal), enabled: Boolean(id) })

function useRefreshQuotes() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: quotesKey })
}

export function useCreateQuote() {
  const key = useIdempotencyKey()
  const refresh = useRefreshQuotes()
  return useMutation<{ data: { data: Quote } }, ApiError, QuotePayload>({ mutationFn: (payload) => api.createQuote(payload, key), onSuccess: refresh })
}

export function useUpdateQuote(id: string) {
  const refresh = useRefreshQuotes()
  return useMutation<unknown, ApiError, QuotePayload>({ mutationFn: (payload) => api.updateQuote(id, payload), onSuccess: refresh })
}

export function useDeleteQuote() {
  const refresh = useRefreshQuotes()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteQuote, onSuccess: refresh })
}

// One key per opened dialog: a double-click or a retry sends the same key, so the customer is not emailed twice.
export function useSendQuote(id: string, key: string) {
  const refresh = useRefreshQuotes()
  return useMutation<SendResult, ApiError, string | undefined>({ mutationFn: (to) => api.sendQuote(id, to, key), onSuccess: refresh })
}

// Converting also creates an order (and invoice) and moves product stock, so those lists refresh too.
export function useConvertQuote(id: string, key: string) {
  const queryClient = useQueryClient()
  return useMutation<ConvertResult, ApiError, { target: 'order' | 'invoice'; dueDate: string | null }>({
    mutationFn: ({ target, dueDate }) => api.convertQuote(id, target, dueDate, key),
    onSuccess: () => Promise.all([quotesKey, ['orders'], ['invoices'], ['products'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

// ---- customer link: no retries on a wrong link, and nothing here depends on a staff session ----

export const publicQuoteKey = (token: string) => ['public-quote', token] as const

export const usePublicQuote = (token: string, enabled: boolean) =>
  useQuery<PublicQuote, ApiError>({ queryKey: publicQuoteKey(token), queryFn: ({ signal }) => api.getPublicQuote(token, signal), enabled, retry: false, refetchOnWindowFocus: false })

export function useRespondToQuote(token: string) {
  const queryClient = useQueryClient()
  return useMutation<PublicQuote, ApiError, Parameters<typeof api.respondToQuote>[1]>({
    mutationFn: (answer) => api.respondToQuote(token, answer),
    // The answer comes back as the updated quote, so the page flips to its result state without another request.
    onSuccess: (quote) => queryClient.setQueryData(publicQuoteKey(token), quote),
  })
}
