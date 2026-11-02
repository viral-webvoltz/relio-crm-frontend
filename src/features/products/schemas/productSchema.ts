import { z } from 'zod'

const wholeNumber = (message: string) => z.string().trim().regex(/^\d{1,7}$/, message)

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().max(64),
  description: z.string().trim().max(5000),
  categoryId: z.string(),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 19 or 19.99'),
  currency: z.string().trim().length(3, 'Use a 3-letter code'),
  trackInventory: z.boolean(),
  initialStock: wholeNumber('Enter a whole number'),
  reorderLevel: wholeNumber('Enter a whole number'),
  isActive: z.boolean(),
})

export const stockFormSchema = z.object({
  delta: z.string().trim().regex(/^-?\d{1,7}$/, 'Enter a whole number like 5 or -3').refine((v) => Number(v) !== 0, 'Cannot be zero'),
  reason: z.string().trim().max(200),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
export type StockFormValues = z.infer<typeof stockFormSchema>

export const emptyProduct: ProductFormValues = {
  name: '', sku: '', description: '', categoryId: '', price: '0', currency: 'USD',
  trackInventory: true, initialStock: '0', reorderLevel: '0', isActive: true,
}
