import { useInfiniteQuery } from '@tanstack/react-query'
import * as api from '../api/timelineApi'
import type { TimelineEntity } from '../types'

// Newest first; "load more" appends older pages.
export const useTimeline = (entity: TimelineEntity, id: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['timeline', entity, id],
    queryFn: ({ pageParam, signal }) => api.getTimeline(entity, id, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled,
  })
