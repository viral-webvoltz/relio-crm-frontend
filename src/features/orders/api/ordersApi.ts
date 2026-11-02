import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import { toMinor } from '@/lib/money'
import type { Discount } from '../totals'
import type { OrderFormValues } from '../schemas/orderSchema'
import type { Order, OrderDetail, OrderStatus } from '../types'

export type OrderListParams = ListParams & { status: string }

export async function getOrders({ search, status, ...rest }: OrderListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Order>>('/orders', { signal, params: { ...rest, search: search || undefined, status: status || undefined } })
  return data
}

export async function getOrder(id: string) {
  const { data } = await httpClient.get<{ data: OrderDetail }>(`/orders/${id}`)
  return data.data
}

// Percentages go to the API as basis points (1% = 100), fixed amounts as minor units.
export function toDiscount({ discountType, discountValue }: Pick<OrderFormValues, 'discountType' | 'discountValue'>): Discount | null {
  if (discountType === 'percent') return { type: 'percent', value: Math.round(Number(discountValue) * 100) }
  if (discountType === 'fixed') return { type: 'fixed', value: toMinor(discountValue) }
  return null
}

export const toTaxRateBps = (taxPercent: string) => Math.round(Number(taxPercent) * 100)

export const createOrder = (values: OrderFormValues, key?: string) =>
  httpClient.post<{ data: Order }>('/orders', {
    contactId: values.contactId || null,
    companyId: values.companyId || null,
    items: values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
    discount: toDiscount(values),
    taxRateBps: toTaxRateBps(values.taxPercent),
    notes: values.notes,
  }, idempotent(key))

export const changeOrderStatus = (id: string, status: OrderStatus, note?: string) => httpClient.post(`/orders/${id}/status`, { status, note })
