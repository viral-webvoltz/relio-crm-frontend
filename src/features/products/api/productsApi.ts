import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import { toMinor } from '@/lib/money'
import type { ProductFormValues, StockFormValues } from '../schemas/productSchema'
import type { Product, ProductCategory, StockMovement } from '../types'

export type ProductListParams = ListParams & { categoryId: string; status: string }

export async function getProducts({ search, categoryId, status, ...rest }: ProductListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Product>>('/products', { signal,
    params: { ...rest, search: search || undefined, categoryId: categoryId || undefined, status: status || undefined },
  })
  return data
}

export async function getProduct(id: string) {
  const { data } = await httpClient.get<{ data: Product }>(`/products/${id}`)
  return data.data
}

// ponytail: assumes a currency with 2 decimal places (cents); zero-decimal currencies need a per-currency exponent.
const toPayload = ({ price, initialStock, reorderLevel, categoryId, ...rest }: ProductFormValues) => ({
  ...rest,
  priceMinor: toMinor(price),
  reorderLevel: Number(reorderLevel),
  categoryId: categoryId || null,
  initialStock: Number(initialStock),
})

export const createProduct = (values: ProductFormValues, key?: string) => httpClient.post('/products', toPayload(values), idempotent(key))

// Stock changes only through adjustments, so initialStock is not sent on update.
export const updateProduct = (id: string, values: ProductFormValues) => {
  const { initialStock: _initialStock, ...payload } = toPayload(values)
  return httpClient.patch(`/products/${id}`, payload)
}

export const deleteProduct = (id: string) => httpClient.delete(`/products/${id}`)

export const adjustStock = (id: string, { delta, reason }: StockFormValues) => httpClient.post(`/products/${id}/stock`, { delta: Number(delta), reason })

export async function getMovements(id: string) {
  const { data } = await httpClient.get<{ data: StockMovement[] }>(`/products/${id}/movements`)
  return data.data
}

export async function getCategories() {
  const { data } = await httpClient.get<{ data: ProductCategory[] }>('/product-categories')
  return data.data
}

export const createCategory = (name: string) => httpClient.post('/product-categories', { name })
export const renameCategory = (id: string, name: string) => httpClient.patch(`/product-categories/${id}`, { name })
export const deleteCategory = (id: string) => httpClient.delete(`/product-categories/${id}`)
