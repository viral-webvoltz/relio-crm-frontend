import { z } from 'zod'

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().max(200).refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email'),
  phone: z.string().trim().max(40),
  jobTitle: z.string().trim().max(100),
  notes: z.string().trim().max(5000),
  companyId: z.string(),
  tagIds: z.array(z.string()).max(20, 'A contact can have up to 20 tags'),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const emptyContact: ContactFormValues = { firstName: '', lastName: '', email: '', phone: '', jobTitle: '', notes: '', companyId: '', tagIds: [], customFields: {} }
