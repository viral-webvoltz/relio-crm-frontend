import type { Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import type { TimelineEntity, TimelineItem } from '../types'

export const TIMELINE_PAGE_SIZE = 20

export async function getTimeline(entity: TimelineEntity, id: string, page: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<TimelineItem>>(`/timeline/${entity}s/${id}`, { params: { page, limit: TIMELINE_PAGE_SIZE }, signal })
  return data
}
