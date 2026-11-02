import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RelatedType } from '@/features/activities/types'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/tasksApi'
import type { TaskFormValues } from '../schemas/taskSchema'

const tasksKey = ['tasks'] as const

export const useTasks = (params: api.TaskListParams) => {
  const query = useQuery({ queryKey: [...tasksKey, 'list', params], queryFn: ({ signal }) => api.getTasks(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...tasksKey, 'list'], params, query.data, api.getTasks)
  return query
}

export const useTask = (id: string | undefined) =>
  useQuery({ queryKey: [...tasksKey, 'detail', id], queryFn: () => api.getTask(id!), enabled: Boolean(id) })

// Task changes also move the dashboard's task numbers.
function useInvalidateTasks() {
  const queryClient = useQueryClient()
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: tasksKey }), queryClient.invalidateQueries({ queryKey: ['dashboard'] })])
}

type SaveVariables = { values: TaskFormValues; link?: { relatedType?: RelatedType; relatedId?: string } }

export function useSaveTask(id?: string) {
  const key = useIdempotencyKey()
  const invalidate = useInvalidateTasks()
  return useMutation<unknown, ApiError, SaveVariables>({
    mutationFn: ({ values, link }) => (id ? api.updateTask(id, values) : api.createTask(values, link ?? {}, key)),
    onSuccess: invalidate,
  })
}

export function useSetTaskStatus() {
  const invalidate = useInvalidateTasks()
  return useMutation<unknown, ApiError, { id: string; status: 'open' | 'done' }>({
    mutationFn: ({ id, status }) => api.updateTask(id, { status }),
    onSuccess: invalidate,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteTask, onSuccess: invalidate })
}
