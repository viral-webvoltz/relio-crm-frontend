import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/ordersApi'
import type { OrderFormValues } from '../schemas/orderSchema'
import type { OrderStatus } from '../types'

const ordersKey = ['orders'] as const

export const useOrders = (params: api.OrderListParams) => {
  const query = useQuery({ queryKey: [...ordersKey, 'list', params], queryFn: ({ signal }) => api.getOrders(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...ordersKey, 'list'], params, query.data, api.getOrders)
  return query
}

export const useOrder = (id: string | undefined) =>
  useQuery({ queryKey: [...ordersKey, 'detail', id], queryFn: () => api.getOrder(id!), enabled: Boolean(id) })

// Placing or cancelling an order moves product stock (and cancelling voids its invoice), so those screens refresh too.
function useInvalidateOrderEffects() {
  const queryClient = useQueryClient()
  return () => Promise.all([ordersKey, ['products'], ['invoices'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function useCreateOrder() {
  const key = useIdempotencyKey()
  const invalidate = useInvalidateOrderEffects()
  return useMutation<{ data: { data: { id: string; orderNumber: number } } }, ApiError, OrderFormValues>({
    mutationFn: (values) => api.createOrder(values, key),
    onSuccess: invalidate,
  })
}

export function useChangeOrderStatus(id: string) {
  const invalidate = useInvalidateOrderEffects()
  return useMutation<unknown, ApiError, { status: OrderStatus; note?: string }>({
    mutationFn: ({ status, note }) => api.changeOrderStatus(id, status, note),
    onSuccess: invalidate,
  })
}
