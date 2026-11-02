import { z } from 'zod'
import { paymentMethods } from '../types'

const amount = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 150 or 150.50').refine((v) => Number(v) > 0, 'Must be more than zero')

export const paymentFormSchema = z.object({
  amount,
  method: z.enum(paymentMethods),
  reference: z.string().trim().max(200),
})

export const refundFormSchema = z.object({
  amount,
  reason: z.string().trim().max(500),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>
export type RefundFormValues = z.infer<typeof refundFormSchema>
