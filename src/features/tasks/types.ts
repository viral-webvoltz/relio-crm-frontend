import type { RelatedType } from '@/features/activities/types'

export const taskPriorities = ['low', 'medium', 'high'] as const
export const taskStatuses = ['open', 'done'] as const
export const taskRecurrences = ['none', 'daily', 'weekly', 'monthly'] as const

export type Task = {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: (typeof taskPriorities)[number]
  status: (typeof taskStatuses)[number]
  recurrence: (typeof taskRecurrences)[number]
  assignedTo: string | null
  assigneeName?: string | null
  relatedType: RelatedType | null
  relatedId: string | null
}
