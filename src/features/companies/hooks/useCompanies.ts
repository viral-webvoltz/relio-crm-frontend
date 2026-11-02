import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ListParams } from '@/lib/apiTypes'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/companiesApi'
import type { CompanyFormValues } from '../schemas/companySchema'

const companiesKey = ['companies'] as const

export const useCompanies = (params: ListParams & { limit?: number }) => {
  const query = useQuery({ queryKey: [...companiesKey, 'list', params], queryFn: ({ signal }) => api.getCompanies(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...companiesKey, 'list'], params, query.data, api.getCompanies)
  return query
}

export const useCompany = (id: string | undefined) =>
  useQuery({ queryKey: [...companiesKey, 'detail', id], queryFn: () => api.getCompany(id!), enabled: Boolean(id) })

export function useSaveCompany(id?: string) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  return useMutation<unknown, ApiError, CompanyFormValues>({
    mutationFn: (values) => (id ? api.updateCompany(id, values) : api.createCompany(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesKey }),
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteCompany,
    // Contacts embed the company name, so they must refetch too.
    // The API also removes the company's tasks and activity.
    onSuccess: () => Promise.all([companiesKey, ['contacts'], ['tasks'], ['activities'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}
