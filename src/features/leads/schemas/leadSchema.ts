import { z } from 'zod'
import { leadPriorities, leadSources, leadStatuses } from '../types'

export const leadFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().max(200).refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email'),
  phone: z.string().trim().max(40),
  companyName: z.string().trim().max(150),
  source: z.enum(leadSources),
  status: z.enum(leadStatuses),
  priority: z.enum(leadPriorities),
  score: z.string().refine((v) => /^\d{1,3}$/.test(v) && Number(v) <= 100, 'Enter 0–100'),
  followUpDate: z.string(),
  assignedTo: z.string(),
  notes: z.string().trim().max(5000),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

export type LeadFormValues = z.infer<typeof leadFormSchema>

export const emptyLead: LeadFormValues = {
  firstName: '', lastName: '', email: '', phone: '', companyName: '',
  source: 'other', status: 'new', priority: 'medium', score: '0', followUpDate: '', assignedTo: '', notes: '', customFields: {},
}
