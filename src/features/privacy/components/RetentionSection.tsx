import { zodResolver } from '@hookform/resolvers/zod'
import { Clock } from 'lucide-react'
import { useMemo } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useRetention, useSaveRetention } from '../hooks/usePrivacy'
import { isShortened, retentionFormSchema, toRetention, toRetentionForm, units, type RetentionFormValues } from '../schemas/privacySchema'
import type { Retention } from '../types'

const rows = [
  { key: 'auditLog', days: 'auditLogDays', label: 'Activity log', hint: 'The record of who changed what and when.' },
  { key: 'emailLog', days: 'emailLogDays', label: 'Email log', hint: 'Emails the system sent, including ones that failed.' },
  { key: 'notification', days: 'notificationDays', label: 'Read notifications', hint: 'Bell notifications people have already read. Unread ones are kept.' },
] as const

const plural = (days: number) => (days % 365 === 0 ? `${days / 365} year${days === 365 ? '' : 's'}` : days % 30 === 0 ? `${days / 30} month${days === 30 ? '' : 's'}` : `${days} days`)

function RetentionRow({ form, row }: { form: UseFormReturn<RetentionFormValues>; row: (typeof rows)[number] }) {
  const { register, watch, formState: { errors } } = form
  const forever = watch(`${row.key}Forever`)
  return (
    <fieldset className="space-y-3 rounded-xl border border-border/70 p-4">
      <legend className="px-1 text-sm font-semibold text-heading">{row.label}</legend>
      <p className="text-sm text-muted">{row.hint}</p>
      <Checkbox label="Keep for ever" {...register(`${row.key}Forever`)} />
      <div className="grid gap-3 sm:grid-cols-[8rem_10rem]">
        <Field label="Keep for" type="number" min={1} inputMode="numeric" disabled={forever} error={errors[row.days]?.message} {...register(row.days)} />
        <SelectField label="Unit" disabled={forever} {...register(`${row.key}Unit`)}>
          {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </SelectField>
      </div>
    </fieldset>
  )
}

function RetentionForm({ saved }: { saved: Retention }) {
  const save = useSaveRetention()
  const values = useMemo(() => toRetentionForm(saved), [saved])
  const form = useForm<RetentionFormValues>({ resolver: zodResolver(retentionFormSchema), defaultValues: values, values })
  const { handleSubmit, setError, reset, formState: { isDirty } } = form
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  const onSubmit = async (formValues: RetentionFormValues) => {
    const next = toRetention(formValues)
    // Shortening a period deletes old entries for good, so say which ones before doing it.
    const shortened = rows.filter((r) => isShortened(saved[r.days], next[r.days]))
    if (shortened.length > 0) {
      const lines = shortened.map((r) => `${r.label} older than ${plural(next[r.days]!)}`).join('; ')
      if (!(await confirmDialog(`Saving will delete these entries within a few hours, and they cannot be brought back: ${lines}.`, { title: 'Delete old entries?', confirmLabel: 'Save and delete old entries' }))) return
    }
    save.mutate(next, {
      onSuccess: () => {
        allowLeave()
        reset(toRetentionForm(next))
        toast.success('Retention saved')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {rows.map((row) => <RetentionRow key={row.key} form={form} row={row} />)}
      <p className="text-xs text-muted">Old entries are removed automatically, checked every few hours. Orders, invoices, quotes and other business records are never touched by this, because accounting rules decide how long you keep them. The shortest you can choose is 30 days.</p>
      {save.error && save.error.code !== 'VALIDATION_ERROR' && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
      <Button type="submit" loading={save.isPending} disabled={!isDirty}>{save.isPending ? 'Saving…' : 'Save retention'}</Button>
    </form>
  )
}

export function RetentionSection() {
  const { data, isPending, isError, error, refetch } = useRetention()
  return (
    <section className="card space-y-4 p-6" aria-labelledby="privacy-retention">
      <div>
        <h2 id="privacy-retention" className="flex items-center gap-2 text-base font-semibold text-heading"><Clock className="size-4 text-primary" aria-hidden /> How long to keep logs</h2>
        <p className="mt-1 text-sm text-muted">Choose how long your activity log, email log and read notifications are kept before they are deleted automatically. By default they are kept for ever.</p>
      </div>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : <RetentionForm saved={data} />}
    </section>
  )
}
