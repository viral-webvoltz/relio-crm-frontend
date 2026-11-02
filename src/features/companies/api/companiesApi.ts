import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import type { Company } from '../types'
import type { CompanyFormValues } from '../schemas/companySchema'

export async function getCompanies(params: ListParams & { limit?: number }, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Company>>('/companies', { signal, params: { ...params, search: params.search || undefined } })
  return data
}

export async function getCompany(id: string) {
  const { data } = await httpClient.get<{ data: Company }>(`/companies/${id}`)
  return data.data
}

export const createCompany = (values: CompanyFormValues, key?: string) => httpClient.post('/companies', values, idempotent(key))
export const updateCompany = (id: string, values: CompanyFormValues) => httpClient.patch(`/companies/${id}`, values)
export const deleteCompany = (id: string) => httpClient.delete(`/companies/${id}`)
