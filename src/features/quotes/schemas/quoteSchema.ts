import { z } from 'zod'
import { toMajor, toMinor } from '@/lib/money'
import type { Discount } from '@/features/orders/totals'
import type { QuoteDetail } from '../types'

export const discountTypes = ['none', 'percent', 'fixed'] as const
const decimal = /^\d+(\.\d{1,2})?$/

export const quoteFormSchema = z
  .object({
    contactId: z.string(),
    companyId: z.string(),
    dealId: z.string(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Choose a product'),
          quantity: z.string().trim().regex(/^[1-9]\d{0,5}$/, 'Whole number, 1 or more'),
          // Blank = the catalogue price; filled = the price offered to this customer.
          unitPrice: z.string().trim().refine((v) => v === '' || decimal.test(v), 'Enter an amount like 49.90'),
          description: z.string().trim().max(500, 'Keep it under 500 characters'),
        }),
      )
      .min(1, 'Add at least one product')
      .max(100, 'A quote can have up to 100 lines')
      .refine((list) => new Set(list.map((i) => i.productId).filter(Boolean)).size === list.filter((i) => i.productId).length, 'List each product once; change its quantity instead'),
    discountType: z.enum(discountTypes),
    discountValue: z.string().trim(),
    taxPercent: z.string().trim().regex(decimal, 'Enter a percentage like 18 or 7.5').refine((v) => Number(v) <= 100, 'At most 100'),
    validUntil: z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Choose a date'),
    notes: z.string().trim().max(2000, 'Keep notes under 2000 characters'),
    terms: z.string().trim().max(5000, 'Keep terms under 5000 characters'),
  })
  .refine((o) => o.discountType === 'none' || (decimal.test(o.discountValue) && Number(o.discountValue) > 0), { message: 'Enter a discount amount', path: ['discountValue'] })
  .refine((o) => o.discountType !== 'percent' || Number(o.discountValue) <= 100, { message: 'At most 100%', path: ['discountValue'] })

export type QuoteFormValues = z.infer<typeof quoteFormSchema>

export const emptyQuote: QuoteFormValues = {
  contactId: '',
  companyId: '',
  dealId: '',
  items: [{ productId: '', quantity: '1', unitPrice: '', description: '' }],
  discountType: 'none',
  discountValue: '',
  taxPercent: '0',
  validUntil: '',
  notes: '',
  terms: '',
}

// Percentages are shown as percent (18) and travel as basis points (1800); prices are shown in major units and travel as minor units.
const bpsToPercent = (bps: number) => String(bps / 100)

export const toFormValues = (q: QuoteDetail): QuoteFormValues => ({
  contactId: q.contactId ?? '',
  companyId: q.companyId ?? '',
  dealId: q.dealId ?? '',
  items: q.items.map((i) => ({ productId: i.productId, quantity: String(i.quantity), unitPrice: toMajor(i.unitPriceMinor), description: i.description ?? '' })),
  discountType: q.discountType ?? 'none',
  discountValue: q.discountType === 'percent' ? bpsToPercent(q.discountValue ?? 0) : q.discountType === 'fixed' ? toMajor(q.discountValue ?? 0) : '',
  taxPercent: bpsToPercent(q.taxRateBps),
  validUntil: q.validUntil ?? '',
  notes: q.notes ?? '',
  terms: q.terms ?? '',
})

export function toDiscount(v: Pick<QuoteFormValues, 'discountType' | 'discountValue'>): Discount | null {
  if (v.discountType === 'percent') return { type: 'percent', value: Math.round(Number(v.discountValue) * 100) }
  if (v.discountType === 'fixed') return { type: 'fixed', value: toMinor(v.discountValue) }
  return null
}
export const toTaxRateBps = (taxPercent: string) => Math.round(Number(taxPercent) * 100)

export type QuotePayload = ReturnType<typeof toPayload>

export const toPayload = (v: QuoteFormValues) => ({
  contactId: v.contactId || null,
  companyId: v.companyId || null,
  dealId: v.dealId || null,
  items: v.items.map((i) => ({
    productId: i.productId,
    quantity: Number(i.quantity),
    ...(i.unitPrice !== '' && { unitPriceMinor: toMinor(i.unitPrice) }),
    description: i.description || null,
  })),
  discount: toDiscount(v),
  taxRateBps: toTaxRateBps(v.taxPercent),
  validUntil: v.validUntil || null,
  notes: v.notes,
  terms: v.terms,
})
