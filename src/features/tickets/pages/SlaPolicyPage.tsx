import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm, type UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useSaveSlaPolicy, useSlaPolicy } from '../hooks/useSla'
import { serverFieldName, slaFormSchema, slaPriorities, toFormValues, toPayload, units, weekdays, type SlaFormValues } from '../schemas/slaSchema'
import type { SlaPolicy } from '../types'

const timezones: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
const priorityLabel = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' } as const
const unitOptions = units.map((u) => <option key={u} value={u}>{u}</option>)

function PolicyForm({ policy }: { readonly policy: SlaPolicy }) {
  const save = useSaveSlaPolicy()
  // Same object until the saved policy changes, so typing never resets the form.
  const values = useMemo(() => toFormValues(policy), [policy])
  const { register, handleSubmit, setError, watch, formState: { errors, isDirty } } = useForm<SlaFormValues>({ resolver: zodResolver(slaFormSchema), values })
  useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, ((name, error, options) => setError(serverFieldName(name) as never, error, options)) as UseFormSetError<SlaFormValues>)
  const always = watch('always')

  const onSubmit = (formValues: SlaFormValues) =>
    save.mutate(toPayload(formValues), {
      onSuccess: (saved) => toast.success(saved.ticketsMoved ? `Saved. ${saved.ticketsMoved} open ticket${saved.ticketsMoved === 1 ? '' : 's'} got new deadlines.` : 'Response targets saved'),
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-8 p-7">
      <FormSection title="How quickly should tickets be answered?">
        <p className="text-sm text-muted">Set two targets for each priority: when the customer should get a first reply, and when the ticket should be resolved.</p>
        {slaPriorities.map((p) => {
          const e = errors.targets?.[p]
          return (
            <fieldset key={p} className="space-y-3 rounded-2xl border border-border/70 p-4">
              <legend className="px-1 text-sm font-medium text-heading">{priorityLabel[p]} tickets</legend>
              <div className="grid grid-cols-[1fr_8rem] items-start gap-3">
                <Field label="First reply within" required type="number" min={1} inputMode="numeric" error={e?.frValue?.message} {...register(`targets.${p}.frValue`)} />
                <SelectField label="Unit" {...register(`targets.${p}.frUnit`)}>{unitOptions}</SelectField>
              </div>
              <div className="grid grid-cols-[1fr_8rem] items-start gap-3">
                <Field label="Resolved within" required type="number" min={1} inputMode="numeric" error={e?.resValue?.message} {...register(`targets.${p}.resValue`)} />
                <SelectField label="Unit" {...register(`targets.${p}.resUnit`)}>{unitOptions}</SelectField>
              </div>
            </fieldset>
          )
        })}
      </FormSection>

      <FormSection title="When does the clock run?">
        <Checkbox label="Around the clock (24/7)" {...register('always')} />
        {!always && (
          <div className="space-y-4">
            <fieldset aria-describedby={errors.days ? 'sla-days-error' : undefined}>
              <legend className="mb-2 text-sm font-medium text-heading">Working days <span className="text-destructive" aria-hidden>*</span></legend>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((d) => <Checkbox key={d.value} label={d.label} value={d.value} {...register('days')} />)}
              </div>
              {errors.days && <p id="sla-days-error" role="alert" className="mt-1 text-xs text-destructive">{errors.days.message}</p>}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opens at" required type="time" error={errors.start?.message} {...register('start')} />
              <Field label="Closes at" required type="time" error={errors.end?.message} {...register('end')} />
            </div>
            <Field label="Timezone" required list="sla-timezones" autoComplete="off" hint="For example Asia/Kolkata or America/New_York." error={errors.timezone?.message} {...register('timezone')} />
            <datalist id="sla-timezones">{timezones.map((z) => <option key={z} value={z} />)}</datalist>
          </div>
        )}
      </FormSection>

      <FormSection title="Warnings">
        <Field
          label="Mark a ticket as “due soon” when"
          required
          type="number"
          min={1}
          max={99}
          inputMode="numeric"
          hint="The percentage of the time that has been used. 80 means a ticket with a 10 hour target shows “due soon” after 8 hours."
          error={errors.warnAtPercent?.message}
          {...register('warnAtPercent')}
        />
      </FormSection>

      <FormSection title="Tickets that are open now">
        <Checkbox label="Also move the deadlines of open tickets" {...register('applyToOpen')} />
        <p className="text-xs text-muted">Off: only new tickets, and tickets whose priority changes, follow these targets. On: every open or waiting ticket gets new deadlines counted from when it was created.</p>
      </FormSection>

      {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
      <Button type="submit" loading={save.isPending} disabled={!isDirty && !save.isPending}>{save.isPending ? 'Saving…' : 'Save targets'}</Button>
    </form>
  )
}

export function SlaPolicyPage() {
  const { data: policy, isPending, isError, error, refetch } = useSlaPolicy()
  return (
    <>
      <PageHeader title="Response targets" subtitle="How quickly your team should reply to and resolve customer tickets (SLA)." />
      <section aria-label="How due times are worked out" className="card mb-6 space-y-2 p-6 text-sm text-body">
        <h2 className="text-base font-semibold text-heading">How due times are worked out</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The clock starts when a ticket is created, and the due times come from its priority.</li>
          <li>It pauses while the ticket is waiting on the customer, and stops when the ticket is resolved or closed.</li>
          <li>If you choose working days and hours, only those hours count. A ticket opened on Friday evening is then due counting from Monday morning.</li>
          <li>Changing the priority of a ticket recalculates its due times.</li>
        </ul>
      </section>
      {isPending ? (
        <PageSkeleton />
      ) : isError ? (
        <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
      ) : (
        <>
          {policy.isDefault && <p role="status" className="mb-4 rounded-xl bg-background px-3 py-2 text-sm text-muted">You are using the standard targets. Save to make them your own.</p>}
          <PolicyForm policy={policy} />
        </>
      )}
    </>
  )
}
