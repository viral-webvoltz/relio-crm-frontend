import { addDays, parseISO, startOfDay } from 'date-fns'
import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import type { AuditEntry, AuditFilters } from '../types'

export type AuditListParams = Pick<ListParams, 'page' | 'limit'> & AuditFilters

// The API wants ISO instants and treats `to` as exclusive, so "to 31 Oct" means before the start of 1 Nov (local time).
const startOf = (day: string) => startOfDay(parseISO(day)).toISOString()
const endAfter = (day: string) => startOfDay(addDays(parseISO(day), 1)).toISOString()

export async function getAuditLogs({ page, limit, entityType, action, actorId, from, to }: AuditListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<AuditEntry>>('/audit-logs', {
    signal,
    params: {
      page,
      limit,
      entityType: entityType || undefined,
      action: action || undefined,
      actorId: actorId || undefined,
      from: from ? startOf(from) : undefined,
      to: to ? endAfter(to) : undefined,
    },
  })
  return data
}
