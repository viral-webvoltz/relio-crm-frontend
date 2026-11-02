import { z } from 'zod'
import { ticketPriorities } from '../types'

export const createTicketFormSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Describe the issue').max(10_000),
  priority: z.enum(ticketPriorities),
  contactId: z.string(),
  assignedTo: z.string(),
})

export const messageFormSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(10_000),
  isInternal: z.boolean(),
})

export type CreateTicketFormValues = z.infer<typeof createTicketFormSchema>
export type MessageFormValues = z.infer<typeof messageFormSchema>
