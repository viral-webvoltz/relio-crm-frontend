import { z } from 'zod'

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  website: z.string().trim().max(200),
  industry: z.string().trim().max(100),
  phone: z.string().trim().max(40),
  notes: z.string().trim().max(5000),
})

export type CompanyFormValues = z.infer<typeof companyFormSchema>

export const emptyCompany: CompanyFormValues = { name: '', website: '', industry: '', phone: '', notes: '' }
