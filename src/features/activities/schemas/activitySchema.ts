import { z } from 'zod'
import { activityTypes } from '../types'

export const activityFormSchema = z.object({
  type: z.enum(activityTypes),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().max(5000),
})

export type ActivityFormValues = z.infer<typeof activityFormSchema>
