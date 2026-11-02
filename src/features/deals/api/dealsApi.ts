import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import { toMinor } from '@/lib/money'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import type { Board, Deal } from '../types'
import type { DealFormValues } from '../schemas/dealSchema'

const toPayload = ({ value, contactId, companyId, ...rest }: DealFormValues) => ({
  ...rest,
  valueMinor: toMinor(value),
  contactId: contactId || null,
  companyId: companyId || null,
})

export async function getBoard() {
  const { data } = await httpClient.get<{ data: Board }>('/deals/board')
  return data.data
}

export type DealListParams = ListParams & { stageId: string }

export async function getDeals({ search, stageId, ...rest }: DealListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Deal>>('/deals', { signal, params: { ...rest, search: search || undefined, stageId: stageId || undefined } })
  return data
}

export async function getDeal(id: string) {
  const { data } = await httpClient.get<{ data: Deal }>(`/deals/${id}`)
  return data.data
}

export const createDeal = (values: DealFormValues, key?: string) => httpClient.post('/deals', toPayload(values), idempotent(key))
export const updateDeal = (id: string, values: DealFormValues) => httpClient.patch(`/deals/${id}`, toPayload(values))
export const deleteDeal = (id: string) => httpClient.delete(`/deals/${id}`)
export const moveDeal = (id: string, stageId: string, lostReason?: string) => httpClient.patch(`/deals/${id}/stage`, { stageId, lostReason })
