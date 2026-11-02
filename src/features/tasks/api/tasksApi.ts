import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { Paginated, SortDir } from '@/lib/apiTypes'
import type { RelatedType } from '@/features/activities/types'
import type { TaskFormValues } from '../schemas/taskSchema'
import type { Task } from '../types'

export type TaskListParams = {
  page: number
  search: string
  status: string // 'open' | 'done' | 'all'
  assignee: string // 'me' | ''
  relatedType?: RelatedType
  relatedId?: string
  dueFrom?: string // YYYY-MM-DD, inclusive
  dueTo?: string
  limit?: number
  sort?: string
  dir?: SortDir
}

export async function getTasks({ search, status, assignee, ...rest }: TaskListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Task>>('/tasks', { signal,
    params: { ...rest, search: search || undefined, status: status === 'all' ? undefined : status, assignee: assignee || undefined },
  })
  return data
}

export async function getTask(id: string) {
  const { data } = await httpClient.get<{ data: Task }>(`/tasks/${id}`)
  return data.data
}

type RelatedLink = { relatedType?: RelatedType; relatedId?: string }

export const createTask = (values: TaskFormValues, link: RelatedLink, key?: string) =>
  httpClient.post('/tasks', {
    title: values.title,
    description: values.description,
    dueDate: values.dueDate,
    priority: values.priority,
    recurrence: values.recurrence,
    assignedTo: values.assignedTo || undefined, // blank = the creator, decided by the API
    ...link,
  }, idempotent(key))

export const updateTask = (id: string, values: Partial<TaskFormValues>) =>
  httpClient.patch(`/tasks/${id}`, { ...values, ...(values.assignedTo !== undefined && { assignedTo: values.assignedTo || null }) })

export const deleteTask = (id: string) => httpClient.delete(`/tasks/${id}`)
