import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { CompanySelect, ContactSelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useProducts } from '@/features/products/hooks/useProducts'
import { formatMoney } from '@/lib/money'
import { toDiscount, toTaxRateBps } from '../api/ordersApi'
import { TotalsSummary } from '../components/TotalsSummary'
import { useCreateOrder } from '../hooks/useOrders'
import { discountTypes, emptyOrder, orderFormSchema, type OrderFormValues } from '../schemas/orderSchema'
import { previewTotals } from '../totals'

export function OrderFormPage() {
  const navigate = useNavigate()
  const create = useCreateOrder()
  // ponytail: first 100 of each in plain selects; swap for searchable comboboxes past that.
  const products = useProducts({ page: 1, search: '', categoryId: '', status: 'active', limit: 100 })

  const { register, handleSubmit, setError, control, watch, formState: { errors, isDirty } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: emptyOrder,
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(create.error, setError)
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const values = watch()

  const productById = new Map(products.data?.data.map((p) => [p.id, p]))
  const chosen = values.items.map((item) => ({ item, product: productById.get(item.productId) }))
  const pricedLines = chosen.flatMap(({ item, product }) => (product && /^\d+$/.test(item.quantity) ? [{ unitPriceMinor: product.priceMinor, quantity: Number(item.quantity) }] : []))
  const currencies = new Set(chosen.flatMap(({ product }) => (product ? [product.currency] : [])))
  const currency = [...currencies][0] ?? 'USD'
  const hasMixedCurrency = currencies.size > 1

  const discountInput = toDiscount({ discountType: values.discountType, discountValue: /^\d+(\.\d{1,2})?$/.test(values.discountValue) ? values.discountValue : '0' })
  const taxBps = /^\d+(\.\d{1,2})?$/.test(values.taxPercent) ? toTaxRateBps(values.taxPercent) : 0
  const totals = previewTotals(pricedLines, discountInput, taxBps)

  const onSubmit = (submitted: OrderFormValues) =>
    create.mutate(submitted, {
      onSuccess: (response) => {
        toast.success(`Order #${response.data.data.orderNumber} placed`)
        allowLeave()
        navigate(`/orders/${response.data.data.id}`)
      },
    })

  const isBlocked = hasMixedCurrency || totals.isDiscountTooLarge || create.isPending

  return (
    <>
      <PageHeader title="New order" subtitle="Stock is reserved as soon as the order is placed." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactSelect control={control} name="contactId" />
          <CompanySelect control={control} name="companyId" />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium text-heading">Items</legend>
          {fields.map((field, index) => {
            const product = chosen[index]?.product
            const quantity = Number(values.items[index]?.quantity)
            const isOverStock = Boolean(product?.trackInventory) && quantity > (product?.stockQuantity ?? 0)
            return (
              <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-start">
                <div>
                  <SelectField label={`Product ${index + 1}`} required error={errors.items?.[index]?.productId?.message} {...register(`items.${index}.productId`)}>
                    <option value="">Choose a product…</option>
                    {products.data?.data.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.priceMinor, p.currency)}</option>
                    ))}
                  </SelectField>
                  {product && (
                    <p className={isOverStock ? 'mt-1 text-xs text-destructive' : 'mt-1 text-xs text-muted'}>
                      {product.trackInventory ? `${product.stockQuantity} in stock${isOverStock ? ' — not enough' : ''}` : 'Stock not tracked'}
                    </p>
                  )}
                </div>
                <Field label="Qty" required inputMode="numeric" error={errors.items?.[index]?.quantity?.message} {...register(`items.${index}.quantity`)} />
                <button
                  type="button"
                  className="link-danger mt-7 inline-flex items-center gap-1 disabled:opacity-40"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="size-3.5" aria-hidden /> Remove
                </button>
              </div>
            )
          })}
          {errors.items?.root?.message && <p role="alert" className="text-xs text-destructive">{errors.items.root.message}</p>}
          <Button variant="ghost" onClick={() => append({ productId: '', quantity: '1' })}>
            <Plus className="size-4" aria-hidden /> Add item
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Discount" {...register('discountType')}>
            {discountTypes.map((t) => <option key={t} value={t}>{t === 'none' ? 'No discount' : t === 'percent' ? 'Percent (%)' : 'Fixed amount'}</option>)}
          </SelectField>
          {values.discountType !== 'none' && (
            <Field label={values.discountType === 'percent' ? 'Discount %' : 'Discount amount'} inputMode="decimal" error={errors.discountValue?.message} {...register('discountValue')} />
          )}
          <Field label="Tax rate %" inputMode="decimal" error={errors.taxPercent?.message} {...register('taxPercent')} />
        </div>
        <Field label="Notes (optional)" error={errors.notes?.message} {...register('notes')} />

        <div className="border-t border-border/60 pt-5">
          <TotalsSummary currency={currency} {...totals} />
          {hasMixedCurrency && <p role="alert" className="mt-2 text-right text-sm text-destructive">All products in an order must use the same currency.</p>}
          {totals.isDiscountTooLarge && <p role="alert" className="mt-2 text-right text-sm text-destructive">The discount is larger than the subtotal.</p>}
        </div>

        {create.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{create.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isBlocked}>{create.isPending ? 'Placing order…' : 'Place order'}</Button>
          <Link to="/orders" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
