import { z } from 'zod'

export const dealFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  value: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 1500 or 1500.50'),
  currency: z.string().trim().length(3, 'Use a 3-letter code'),
  expectedCloseDate: z.string(),
  contactId: z.string(),
  companyId: z.string(),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

export type DealFormValues = z.infer<typeof dealFormSchema>

export const emptyDeal: DealFormValues = { title: '', value: '0', currency: 'USD', expectedCloseDate: '', contactId: '', companyId: '', customFields: {} }
