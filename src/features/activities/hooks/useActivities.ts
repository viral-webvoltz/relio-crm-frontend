import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/activitiesApi'
import type { ActivityFormValues } from '../schemas/activitySchema'
import type { RelatedType } from '../types'

const activitiesKey = ['activities'] as const

export const useActivities = (type: RelatedType, id: string, enabled: boolean) =>
  useQuery({ queryKey: [...activitiesKey, type, id], queryFn: () => api.getActivities(type, id), enabled })

export const useRecentActivities = () => useQuery({ queryKey: [...activitiesKey, 'recent'], queryFn: api.getRecentActivities })

// Every activity change can show up in a record's timeline and in the global feed, so refresh them all.
function useInvalidateActivities() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: activitiesKey })
}

export function useLogActivity(type: RelatedType, id: string) {
  const invalidate = useInvalidateActivities()
  return useMutation<unknown, ApiError, ActivityFormValues>({ mutationFn: (values) => api.createActivity(type, id, values), onSuccess: invalidate })
}

export function useUpdateActivity() {
  const invalidate = useInvalidateActivities()
  return useMutation<unknown, ApiError, { id: string; values: ActivityFormValues }>({
    mutationFn: ({ id, values }) => api.updateActivity(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteActivity() {
  const invalidate = useInvalidateActivities()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteActivity, onSuccess: invalidate })
}
