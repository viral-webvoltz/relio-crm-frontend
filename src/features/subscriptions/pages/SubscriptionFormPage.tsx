import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CompanySelect, ContactSelect } from '@/components/entity/EntitySelects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { previewTotals } from '@/features/orders/totals'
import { knownProduct, ProductSelect } from '@/features/quotes/components/Pickers'
import { formatMoney, toMajor, toMinor } from '@/lib/money'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { subscriptionErrorText } from '../errors'
import { useCreateSubscription, useSubscription, useUpdateSubscription } from '../hooks/useSubscriptions'
import { discountTypes, emptySubscription, subscriptionFormSchema, toCreatePayload, toDiscount, toFormValues, toTaxRateBps, toUpdatePayload, type SubscriptionFormValues } from '../schemas/subscriptionSchema'
import { canEdit, everyText, type SubscriptionDetail } from '../types'

const DECIMAL = /^\d+(\.\d{1,2})?$/
const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'
const longDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

const endText = (v: SubscriptionFormValues) => {
  if (v.endMode === 'date' && v.endOn) return `, until ${longDate(v.endOn)}`
  if (v.endMode === 'count' && /^\d+$/.test(v.maxRuns)) return `, ${v.maxRuns} invoice${v.maxRuns === '1' ? '' : 's'} in total`
  return ', until you cancel it'
}

function SubscriptionForm({ subscription }: { subscription?: SubscriptionDetail }) {
  const navigate = useNavigate()
  const create = useCreateSubscription()
  const update = useUpdateSubscription(subscription?.id ?? '')
  const mutation = subscription ? update : create
  const today = format(new Date(), 'yyyy-MM-dd')

  const { register, handleSubmit, setError, setValue, control, watch, formState: { errors, isDirty } } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: subscription ? toFormValues(subscription) : emptySubscription,
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(mutation.error, setError)
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const values = watch()

  // Live preview only; the server recalculates and its numbers are the ones that are used on every invoice.
  const lines = values.items.flatMap((item) => {
    const product = knownProduct(item.productId)
    const unit = item.unitPrice !== '' ? (DECIMAL.test(item.unitPrice) ? toMinor(item.unitPrice) : null) : (product?.priceMinor ?? null)
    return unit !== null && /^\d+$/.test(item.quantity) ? [{ unitPriceMinor: unit, quantity: Number(item.quantity) }] : []
  })
  const currencies = new Set(values.items.flatMap((i) => knownProduct(i.productId)?.currency ?? []))
  const currency = subscription?.currency ?? [...currencies][0] ?? 'USD'
  const hasMixedCurrency = currencies.size > 1
  const discount = toDiscount({ discountType: values.discountType, discountValue: DECIMAL.test(values.discountValue) ? values.discountValue : '0' })
  const totals = previewTotals(lines, discount, DECIMAL.test(values.taxPercent) ? toTaxRateBps(values.taxPercent) : 0)

  const count = /^\d+$/.test(values.intervalCount) ? Number(values.intervalCount) : 1
  const summary = `Invoices of ${formatMoney(totals.totalMinor, currency)} ${everyText(values.intervalUnit, count)}${values.startOn ? `, starting ${longDate(values.startOn)}` : ''}${endText(values)}.`

  const onSubmit = (submitted: SubscriptionFormValues) => {
    const done = (id: string, message: string) => {
      toast.success(message)
      allowLeave()
      navigate(`/subscriptions/${id}`)
    }
    if (subscription) update.mutate(toUpdatePayload(submitted), { onSuccess: () => done(subscription.id, 'Subscription saved') })
    else create.mutate(toCreatePayload(submitted), { onSuccess: (response) => done(response.data.data.id, `“${response.data.data.name}” created`) })
  }

  const isBlocked = hasMixedCurrency || totals.isDiscountTooLarge || mutation.isPending
  const cancelTo = subscription ? `/subscriptions/${subscription.id}` : '/subscriptions'

  return (
    <>
      <PageHeader title={subscription ? `Edit ${subscription.name}` : 'New subscription'} subtitle="Invoice a customer automatically on a schedule." />
      {subscription && (
        <p role="status" className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-heading">
          Changes apply to future invoices only. Invoices that were already created are not touched. The customer and the schedule can’t be changed; create a new subscription for that.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-7">
        <Field label="Name" required autoComplete="off" placeholder="e.g. Monthly support plan" error={errors.name?.message} {...register('name')} />

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium text-heading">Who is billed</legend>
          {subscription ? (
            <p className="text-sm text-body">{subscription.customerName ?? 'No customer'}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <ContactSelect control={control} name="contactId" hint="Invoices can be emailed to the contact automatically." />
              <CompanySelect control={control} name="companyId" />
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium text-heading">Items on every invoice</legend>
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
                        // Start from today's catalogue price; the price can still be changed for this customer.
                        if (product) setValue(`items.${index}.unitPrice`, toMajor(product.priceMinor), { shouldDirty: true, shouldValidate: true })
                      }}
                    />
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <Field label="Qty" required inputMode="numeric" error={row?.quantity?.message} {...register(`items.${index}.quantity`)} />
                  <Field label="Price each" inputMode="decimal" hint="This price stays the same on every invoice until you edit it." error={row?.unitPrice?.message} {...register(`items.${index}.unitPrice`)} />
                </div>
                <button type="button" className="link-danger inline-flex min-h-11 items-center gap-1 disabled:opacity-40" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>
                  <Trash2 className="size-3.5" aria-hidden /> Remove item
                </button>
              </div>
            )
          })}
          {errors.items?.message && <p role="alert" className="text-xs text-destructive">{errors.items.message}</p>}
          {errors.items?.root?.message && <p role="alert" className="text-xs text-destructive">{errors.items.root.message}</p>}
          <Button variant="ghost" onClick={() => append({ productId: '', quantity: '1', unitPrice: '' })}>
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

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium text-heading">Schedule</legend>
          {subscription ? (
            <p className="text-sm text-body">
              <span className="capitalize">{everyText(subscription.intervalUnit, subscription.intervalCount)}</span>, starting {longDate(subscription.startOn)}.
            </p>
          ) : (
            <>
              <div className="grid items-end gap-3 sm:grid-cols-[auto_6rem_1fr]">
                <span className="pb-3 text-sm text-heading">Bill every</span>
                <Field label="How many" required inputMode="numeric" error={errors.intervalCount?.message} {...register('intervalCount')} />
                <SelectField label="Unit" {...register('intervalUnit')}>
                  <option value="week">{count === 1 ? 'week' : 'weeks'}</option>
                  <option value="month">{count === 1 ? 'month' : 'months'}</option>
                  <option value="year">{count === 1 ? 'year' : 'years'}</option>
                </SelectField>
              </div>
              <Field label="First invoice date" type="date" required min={today} hint="The first invoice is created on this day. It can’t be in the past." error={errors.startOn?.message} {...register('startOn')} />
            </>
          )}
          <SelectField label="It ends" {...register('endMode')}>
            <option value="never">Never — until I cancel it</option>
            <option value="date">On a date</option>
            <option value="count">After a number of invoices</option>
          </SelectField>
          {values.endMode === 'date' && <Field label="Last day" type="date" required min={values.startOn || today} error={errors.endOn?.message} {...register('endOn')} />}
          {values.endMode === 'count' && <Field label="Number of invoices" required inputMode="numeric" error={errors.maxRuns?.message} {...register('maxRuns')} />}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium text-heading">Invoices</legend>
          <Field label="Payment due in (days)" required inputMode="numeric" hint="How many days after an invoice is created the customer has to pay." error={errors.dueDays?.message} {...register('dueDays')} />
          <Checkbox label="Email each invoice to the customer automatically" {...register('autoSend')} />
          <p className="text-xs text-muted">
            When this is on, every new invoice is emailed to the contact as soon as it is created. When it is off, invoices are created and you send them yourself. Emailing needs a contact with an email address, and email sending to be set up.
          </p>
        </fieldset>

        <div>
          <label htmlFor="sub-notes" className="mb-1.5 block text-sm font-medium text-heading">Internal notes (optional)</label>
          <textarea id="sub-notes" rows={3} aria-invalid={errors.notes ? true : undefined} className="input-base h-auto py-2.5" {...register('notes')} />
          {errors.notes && <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>}
        </div>

        <div className="border-t border-border/60 pt-5">
          <p role="status" className="mb-3 text-sm font-medium text-heading">{summary}</p>
          <TotalsSummary currency={currency} {...totals} />
          {hasMixedCurrency && <p role="alert" className="mt-2 text-right text-sm text-destructive">All products in a subscription must use the same currency.</p>}
          {totals.isDiscountTooLarge && <p role="alert" className="mt-2 text-right text-sm text-destructive">The discount is larger than the total of the items.</p>}
          <p className="mt-2 text-right text-xs text-muted">This is what each invoice totals. It is checked again when you save.</p>
        </div>

        {mutation.error && <p role="alert" className={alertClass}>{subscriptionErrorText(mutation.error)}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={mutation.isPending} disabled={isBlocked}>{mutation.isPending ? 'Saving…' : subscription ? 'Save changes' : 'Create subscription'}</Button>
          <Link to={cancelTo} className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}

export function SubscriptionFormPage() {
  const { id } = useParams()
  const { data: subscription, isPending, isError, error, refetch } = useSubscription(id)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
  if (subscription && !canEdit(subscription.status)) {
    return (
      <div className="card space-y-3 p-7">
        <h1 className="text-lg font-semibold text-heading">This subscription can’t be edited</h1>
        <p className="text-sm text-body">It has been {subscription.status === 'cancelled' ? 'cancelled' : 'completed'}. Create a new subscription if the arrangement continues.</p>
        <Link to={`/subscriptions/${subscription.id}`} className="btn-ghost">Back to {subscription.name}</Link>
      </div>
    )
  }
  return <SubscriptionForm subscription={subscription} />
}
