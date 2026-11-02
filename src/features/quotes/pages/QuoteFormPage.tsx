import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CompanySelect, ContactSelect } from '@/components/entity/EntitySelects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { previewTotals } from '@/features/orders/totals'
import { toMajor, toMinor } from '@/lib/money'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { DealSelect, knownProduct, ProductSelect } from '../components/Pickers'
import { quoteErrorText } from '../errors'
import { useCreateQuote, useQuote, useUpdateQuote } from '../hooks/useQuotes'
import { discountTypes, emptyQuote, quoteFormSchema, toDiscount, toFormValues, toPayload, toTaxRateBps, type QuoteFormValues } from '../schemas/quoteSchema'
import { canEdit, type QuoteDetail } from '../types'

const DECIMAL = /^\d+(\.\d{1,2})?$/
const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'

function QuoteForm({ quote, dealId }: { quote?: QuoteDetail; dealId: string }) {
  const navigate = useNavigate()
  const create = useCreateQuote()
  const update = useUpdateQuote(quote?.id ?? '')
  const mutation = quote ? update : create

  const { register, handleSubmit, setError, setValue, control, watch, formState: { errors, isDirty } } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quote ? toFormValues(quote) : { ...emptyQuote, dealId },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(mutation.error, setError)
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const values = watch()

  // Live preview only; the server recalculates and its numbers are the ones that are saved.
  const lines = values.items.flatMap((item) => {
    const product = knownProduct(item.productId)
    const unit = item.unitPrice !== '' ? (DECIMAL.test(item.unitPrice) ? toMinor(item.unitPrice) : null) : (product?.priceMinor ?? null)
    return unit !== null && /^\d+$/.test(item.quantity) ? [{ unitPriceMinor: unit, quantity: Number(item.quantity) }] : []
  })
  const currencies = new Set(values.items.flatMap((i) => knownProduct(i.productId)?.currency ?? []))
  const currency = quote?.currency ?? [...currencies][0] ?? 'USD'
  const hasMixedCurrency = currencies.size > 1
  const discount = toDiscount({ discountType: values.discountType, discountValue: DECIMAL.test(values.discountValue) ? values.discountValue : '0' })
  const totals = previewTotals(lines, discount, DECIMAL.test(values.taxPercent) ? toTaxRateBps(values.taxPercent) : 0)

  const onSubmit = (submitted: QuoteFormValues) => {
    const payload = toPayload(submitted)
    const done = (id: string, message: string) => {
      toast.success(message)
      allowLeave()
      navigate(`/quotes/${id}`)
    }
    if (quote) update.mutate(payload, { onSuccess: () => done(quote.id, 'Quote saved') })
    else create.mutate(payload, { onSuccess: (response) => done(response.data.data.id, `Quote #${response.data.data.quoteNumber} created`) })
  }

  const isBlocked = hasMixedCurrency || totals.isDiscountTooLarge || mutation.isPending
  const cancelTo = quote ? `/quotes/${quote.id}` : '/quotes'

  return (
    <>
      <PageHeader title={quote ? `Edit quote #${quote.quoteNumber}` : 'New quote'} subtitle="A price offer the customer can accept from a private link." />
      {quote?.status === 'sent' && (
        <p role="status" className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-heading">
          This quote was already sent. Saving your changes turns it back into a draft and the customer’s old link stops working. Send it again afterwards to give them a new one.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactSelect control={control} name="contactId" />
          <CompanySelect control={control} name="companyId" />
        </div>
        <DealSelect control={control} name="dealId" />

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium text-heading">Items</legend>
          {fields.map((field, index) => {
            const row = errors.items?.[index]
            return (
              <div key={field.id} className="space-y-3 rounded-2xl border border-border/70 p-4">
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  render={({ field: f }) => (
                    <ProductSelect
                      label={`Product ${index + 1}`}
                      required
                      value={f.value}
                      error={row?.productId?.message}
                      onChange={(id, product) => {
                        f.onChange(id)
                        // Start from the catalogue price; the price can still be changed for this customer.
                        if (product) setValue(`items.${index}.unitPrice`, toMajor(product.priceMinor), { shouldDirty: true, shouldValidate: true })
                      }}
                    />
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <Field label="Qty" required inputMode="numeric" error={row?.quantity?.message} {...register(`items.${index}.quantity`)} />
                  <Field label="Price each" inputMode="decimal" hint="Leave empty to use the catalogue price." error={row?.unitPrice?.message} {...register(`items.${index}.unitPrice`)} />
                </div>
                <Field label="Line note (optional)" autoComplete="off" error={row?.description?.message} {...register(`items.${index}.description`)} />
                <button type="button" className="link-danger inline-flex items-center gap-1 disabled:opacity-40" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>
                  <Trash2 className="size-3.5" aria-hidden /> Remove item
                </button>
              </div>
            )
          })}
          {errors.items?.message && <p role="alert" className="text-xs text-destructive">{errors.items.message}</p>}
          {errors.items?.root?.message && <p role="alert" className="text-xs text-destructive">{errors.items.root.message}</p>}
          <Button variant="ghost" onClick={() => append({ productId: '', quantity: '1', unitPrice: '', description: '' })}>
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

        <Field label="Valid until" type="date" hint="Leave empty for 30 days from when you send it." error={errors.validUntil?.message} {...register('validUntil')} />

        <div>
          <label htmlFor="quote-notes" className="mb-1.5 block text-sm font-medium text-heading">Notes for the customer (optional)</label>
          <textarea id="quote-notes" rows={3} aria-invalid={errors.notes ? true : undefined} className="input-base h-auto py-2.5" {...register('notes')} />
          {errors.notes && <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>}
        </div>
        <div>
          <label htmlFor="quote-terms" className="mb-1.5 block text-sm font-medium text-heading">Terms (optional)</label>
          <textarea id="quote-terms" rows={4} aria-invalid={errors.terms ? true : undefined} className="input-base h-auto py-2.5" {...register('terms')} />
          {errors.terms && <p className="mt-1 text-xs text-destructive">{errors.terms.message}</p>}
        </div>

        <div className="border-t border-border/60 pt-5">
          <TotalsSummary currency={currency} {...totals} />
          {hasMixedCurrency && <p role="alert" className="mt-2 text-right text-sm text-destructive">All products in a quote must use the same currency.</p>}
          {totals.isDiscountTooLarge && <p role="alert" className="mt-2 text-right text-sm text-destructive">The discount is larger than the subtotal.</p>}
          <p className="mt-2 text-right text-xs text-muted">Totals are checked again when you save.</p>
        </div>

        {mutation.error && <p role="alert" className={alertClass}>{quoteErrorText(mutation.error)}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={mutation.isPending} disabled={isBlocked}>{mutation.isPending ? 'Saving…' : quote ? 'Save changes' : 'Create quote'}</Button>
          <Link to={cancelTo} className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}

export function QuoteFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { data: quote, isPending, isError, error, refetch } = useQuote(id)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
  if (quote && !canEdit(quote.status)) {
    return (
      <div className="card space-y-3 p-7">
        <h1 className="text-lg font-semibold text-heading">This quote can’t be edited</h1>
        <p className="text-sm text-body">The customer has already answered it, or it was turned into an order. Create a new quote if the offer has changed.</p>
        <Link to={`/quotes/${quote.id}`} className="btn-ghost">Back to quote #{quote.quoteNumber}</Link>
      </div>
    )
  }
  return <QuoteForm quote={quote} dealId={searchParams.get('dealId') ?? ''} />
}
