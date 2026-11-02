import { z } from 'zod'
import { MAX_EMAIL_BODY, MAX_EMAIL_SUBJECT } from '../types'

export const emailFormSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(MAX_EMAIL_SUBJECT),
  body: z.string().trim().min(1, 'Write a message').max(MAX_EMAIL_BODY),
})

export type EmailFormValues = z.infer<typeof emailFormSchema>
