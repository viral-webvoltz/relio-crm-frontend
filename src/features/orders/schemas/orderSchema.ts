import { z } from 'zod'

export const discountTypes = ['none', 'percent', 'fixed'] as const

const decimal = /^\d+(\.\d{1,2})?$/

export const orderFormSchema = z
  .object({
    contactId: z.string(),
    companyId: z.string(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Choose a product'),
          quantity: z.string().trim().regex(/^[1-9]\d{0,5}$/, 'Whole number, 1 or more'),
        }),
      )
      .min(1, 'Add at least one product'),
    discountType: z.enum(discountTypes),
    discountValue: z.string().trim(),
    taxPercent: z.string().trim().regex(decimal, 'Enter a percentage like 18 or 7.5').refine((v) => Number(v) <= 100, 'At most 100'),
    notes: z.string().trim().max(2000),
  })
  .refine((o) => o.discountType === 'none' || (decimal.test(o.discountValue) && Number(o.discountValue) > 0), {
    message: 'Enter a discount amount',
    path: ['discountValue'],
  })
  .refine((o) => o.discountType !== 'percent' || Number(o.discountValue) <= 100, { message: 'At most 100%', path: ['discountValue'] })

export type OrderFormValues = z.infer<typeof orderFormSchema>

export const emptyOrder: OrderFormValues = {
  contactId: '', companyId: '', items: [{ productId: '', quantity: '1' }], discountType: 'none', discountValue: '', taxPercent: '0', notes: '',
}
