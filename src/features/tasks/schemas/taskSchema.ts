import { z } from 'zod'
import { taskPriorities, taskRecurrences, taskStatuses } from '../types'

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(5000),
    dueDate: z.string(),
    priority: z.enum(taskPriorities),
    status: z.enum(taskStatuses),
    recurrence: z.enum(taskRecurrences),
    assignedTo: z.string(),
  })
  .refine((t) => t.recurrence === 'none' || t.dueDate !== '', { message: 'A repeating task needs a due date', path: ['dueDate'] })

export type TaskFormValues = z.infer<typeof taskFormSchema>

export const emptyTask: TaskFormValues = { title: '', description: '', dueDate: '', priority: 'medium', status: 'open', recurrence: 'none', assignedTo: '' }
