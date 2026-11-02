import { z } from 'zod'
import { toMajor, toMinor } from '@/lib/money'
import type { Discount } from '@/features/orders/totals'
import { intervalUnits, type SubscriptionDetail } from '../types'

export const discountTypes = ['none', 'percent', 'fixed'] as const
export const endModes = ['never', 'date', 'count'] as const
const decimal = /^\d+(\.\d{1,2})?$/
const isoDate = /^\d{4}-\d{2}-\d{2}$/

export const subscriptionFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the subscription a name').max(120, 'Keep it under 120 characters'),
    contactId: z.string(),
    companyId: z.string(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Choose a product'),
          quantity: z.string().trim().regex(/^[1-9]\d{0,4}$/, 'Whole number, 1 or more'),
          // Blank = today's catalogue price, which is then fixed for the life of the subscription.
          unitPrice: z.string().trim().refine((v) => v === '' || decimal.test(v), 'Enter an amount like 49.90'),
        }),
      )
      .min(1, 'Add at least one product')
      .max(50, 'A subscription can have up to 50 products')
      .refine((list) => new Set(list.map((i) => i.productId).filter(Boolean)).size === list.filter((i) => i.productId).length, 'List each product once; change its quantity instead'),
    discountType: z.enum(discountTypes),
    discountValue: z.string().trim(),
    taxPercent: z.string().trim().regex(decimal, 'Enter a percentage like 18 or 7.5').refine((v) => Number(v) <= 100, 'At most 100'),
    intervalCount: z.string().trim().regex(/^[1-9]\d?$/, 'A whole number from 1 to 52').refine((v) => Number(v) <= 52, 'At most 52'),
    intervalUnit: z.enum(intervalUnits),
    startOn: z.string().regex(isoDate, 'Choose the first invoice date'),
    endMode: z.enum(endModes),
    endOn: z.string(),
    maxRuns: z.string().trim(),
    dueDays: z.string().trim().regex(/^\d{1,3}$/, 'Whole days, 0 to 365').refine((v) => Number(v) <= 365, 'At most 365 days'),
    autoSend: z.boolean(),
    notes: z.string().trim().max(2000, 'Keep notes under 2000 characters'),
  })
  .refine((o) => o.discountType === 'none' || (decimal.test(o.discountValue) && Number(o.discountValue) > 0), { message: 'Enter a discount amount', path: ['discountValue'] })
  .refine((o) => o.discountType !== 'percent' || Number(o.discountValue) <= 100, { message: 'At most 100%', path: ['discountValue'] })
  .refine((o) => o.endMode !== 'date' || isoDate.test(o.endOn), { message: 'Choose the end date', path: ['endOn'] })
  .refine((o) => o.endMode !== 'date' || !isoDate.test(o.endOn) || o.endOn >= o.startOn, { message: 'The end date is before the first invoice date', path: ['endOn'] })
  .refine((o) => o.endMode !== 'count' || (/^[1-9]\d{0,3}$/.test(o.maxRuns) && Number(o.maxRuns) <= 1200), { message: 'A whole number from 1 to 1200', path: ['maxRuns'] })

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>

export const emptySubscription: SubscriptionFormValues = {
  name: '',
  contactId: '',
  companyId: '',
  items: [{ productId: '', quantity: '1', unitPrice: '' }],
  discountType: 'none',
  discountValue: '',
  taxPercent: '0',
  intervalCount: '1',
  intervalUnit: 'month',
  startOn: '',
  endMode: 'never',
  endOn: '',
  maxRuns: '',
  dueDays: '14',
  autoSend: false,
  notes: '',
}

// Percentages are shown as percent (18) and travel as basis points (1800); prices are shown in major units and travel as minor units.
const bpsToPercent = (bps: number) => String(bps / 100)

export const toFormValues = (s: SubscriptionDetail): SubscriptionFormValues => ({
  name: s.name,
  contactId: s.contactId ?? '',
  companyId: s.companyId ?? '',
  items: s.items.map((i) => ({ productId: i.productId, quantity: String(i.quantity), unitPrice: toMajor(i.unitPriceMinor) })),
  discountType: s.discountType ?? 'none',
  discountValue: s.discountType === 'percent' ? bpsToPercent(s.discountValue ?? 0) : s.discountType === 'fixed' ? toMajor(s.discountValue ?? 0) : '',
  taxPercent: bpsToPercent(s.taxRateBps),
  intervalCount: String(s.intervalCount),
  intervalUnit: s.intervalUnit,
  startOn: s.startOn,
  endMode: s.endOn ? 'date' : s.maxRuns ? 'count' : 'never',
  endOn: s.endOn ?? '',
  maxRuns: s.maxRuns ? String(s.maxRuns) : '',
  dueDays: String(s.dueDays),
  autoSend: s.autoSend,
  notes: s.notes ?? '',
})

export function toDiscount(v: Pick<SubscriptionFormValues, 'discountType' | 'discountValue'>): Discount | null {
  if (v.discountType === 'percent') return { type: 'percent', value: Math.round(Number(v.discountValue) * 100) }
  if (v.discountType === 'fixed') return { type: 'fixed', value: toMinor(v.discountValue) }
  return null
}
export const toTaxRateBps = (taxPercent: string) => Math.round(Number(taxPercent) * 100)

const terms = (v: SubscriptionFormValues) => ({
  name: v.name,
  items: v.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), ...(i.unitPrice !== '' && { unitPriceMinor: toMinor(i.unitPrice) }) })),
  discount: toDiscount(v),
  taxRateBps: toTaxRateBps(v.taxPercent),
  endOn: v.endMode === 'date' ? v.endOn : null,
  maxRuns: v.endMode === 'count' ? Number(v.maxRuns) : null,
  dueDays: Number(v.dueDays),
  autoSend: v.autoSend,
  notes: v.notes,
})

export type CreateSubscriptionPayload = ReturnType<typeof toCreatePayload>
export type UpdateSubscriptionPayload = ReturnType<typeof terms>

/** Creating also fixes who is billed and the schedule. */
export const toCreatePayload = (v: SubscriptionFormValues) => ({
  ...terms(v),
  contactId: v.contactId || null,
  companyId: v.companyId || null,
  intervalUnit: v.intervalUnit,
  intervalCount: Number(v.intervalCount),
  startOn: v.startOn,
})

/** The server refuses changes to the customer and the schedule on a live subscription, so they are never sent. */
export const toUpdatePayload = (v: SubscriptionFormValues): UpdateSubscriptionPayload => terms(v)
