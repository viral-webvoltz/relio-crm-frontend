import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/productsApi'
import type { ProductFormValues, StockFormValues } from '../schemas/productSchema'

const productsKey = ['products'] as const
const categoriesKey = ['product-categories'] as const

export const useProducts = (params: api.ProductListParams) => {
  const query = useQuery({ queryKey: [...productsKey, 'list', params], queryFn: ({ signal }) => api.getProducts(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...productsKey, 'list'], params, query.data, api.getProducts)
  return query
}

export const useProduct = (id: string | undefined) =>
  useQuery({ queryKey: [...productsKey, 'detail', id], queryFn: () => api.getProduct(id!), enabled: Boolean(id) })

export const useMovements = (id: string, enabled: boolean) =>
  useQuery({ queryKey: [...productsKey, 'movements', id], queryFn: () => api.getMovements(id), enabled })

export const useCategories = () => useQuery({ queryKey: categoriesKey, queryFn: api.getCategories })

export function useSaveProduct(id?: string) {
  const key = useIdempotencyKey()
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, ProductFormValues>({
    mutationFn: (values) => (id ? api.updateProduct(id, values) : api.createProduct(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKey }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteProduct, onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKey }) })
}

// Refreshes the list, the detail and the movement history together.
export function useAdjustStock(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, StockFormValues>({
    mutationFn: (values) => api.adjustStock(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKey }),
  })
}

// Category names are embedded in product rows, so products refresh too.
function useCategoryMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, TVariables>({
    mutationFn,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: categoriesKey }), queryClient.invalidateQueries({ queryKey: productsKey })]),
  })
}

export const useCreateCategory = () => useCategoryMutation((name: string) => api.createCategory(name))
export const useRenameCategory = () => useCategoryMutation(({ id, name }: { id: string; name: string }) => api.renameCategory(id, name))
export const useDeleteCategory = () => useCategoryMutation((id: string) => api.deleteCategory(id))
