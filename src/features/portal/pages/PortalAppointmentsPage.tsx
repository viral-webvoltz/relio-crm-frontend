import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { addMinutes, format, parseISO } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useListParams } from '@/lib/useListParams'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useAppointments, useCancelAppointment, useRequestAppointment } from '../hooks/usePortalExtras'
import { appointmentLabel, appointmentTone, DURATIONS, type PortalAppointment } from '../portalExtras'

const MAX_DAYS = 180
const startOf = (v: { date: string; time: string }) => new Date(`${v.date}T${v.time}`)

const schema = z
  .object({
    subject: z.string().trim().min(1, 'Tell us what the appointment is about').max(150, 'Keep it under 150 characters'),
    date: z.string().min(1, 'Choose a day'),
    time: z.string().min(1, 'Choose a time'),
    durationMinutes: z.string(),
    notes: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
  })
  .superRefine((v, ctx) => {
    if (!v.date || !v.time) return
    const at = startOf(v)
    if (Number.isNaN(at.getTime())) return ctx.addIssue({ code: 'custom', path: ['date'], message: 'Choose a valid day and time' })
    if (at.getTime() <= Date.now()) ctx.addIssue({ code: 'custom', path: ['time'], message: 'Choose a time in the future' })
    else if (at.getTime() > Date.now() + MAX_DAYS * 86_400_000) ctx.addIssue({ code: 'custom', path: ['date'], message: `Choose a day within the next ${MAX_DAYS} days` })
  })
type FormValues = z.infer<typeof schema>

const when = (a: PortalAppointment) => `${format(parseISO(a.startsAt), 'EEE d MMM yyyy, h:mm a')} – ${format(addMinutes(parseISO(a.startsAt), a.durationMinutes), 'h:mm a')}`
const lengthLabel = (m: number) => (m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : `${m / 60} hours`)

export function PortalAppointmentsPage() {
  const { params, update } = useListParams()
  const { data, isPending, isFetching, isError, error, refetch } = useAppointments(params.page)
  const request = useRequestAppointment()
  const cancel = useCancelAppointment()

  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', date: '', time: '10:00', durationMinutes: '30', notes: '' },
  })
  useUnsavedGuard(isDirty)
  useServerFieldErrors(request.error, setError)

  const onSubmit = (v: FormValues) =>
    request.mutate(
      { subject: v.subject, startsAt: startOf(v).toISOString(), durationMinutes: Number(v.durationMinutes), ...(v.notes && { notes: v.notes }) },
      { onSuccess: () => { toast.success('Request sent. We will confirm your appointment soon.'); reset() } },
    )

  const handleCancel = async (a: PortalAppointment) => {
    if (!(await confirmDialog(`Cancel your appointment "${a.subject}"?`, { title: 'Cancel appointment?', confirmLabel: 'Cancel appointment' }))) return
    cancel.mutate(a.id, { onSuccess: () => toast.success('Appointment cancelled'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<PortalAppointment>[] = [
    { key: 'subject', header: 'About', primary: true, cell: (a) => <><div className="font-medium text-heading">{a.subject}</div>{a.notes && <div className="text-xs text-muted">{a.notes}</div>}</> },
    { key: 'when', header: 'When', cell: when },
    { key: 'status', header: 'Status', cell: (a) => <Badge tone={appointmentTone[a.status]}>{appointmentLabel[a.status]}</Badge> },
  ]

  return (
    <>
      <PageHeader title="Appointments" subtitle="Ask for a time to talk with our team." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mb-6 max-w-2xl space-y-4 p-6">
        <h2 className="text-base font-semibold text-heading">Request an appointment</h2>
        <Field label="What is it about?" required error={errors.subject?.message} {...register('subject')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Day" type="date" required error={errors.date?.message} {...register('date')} />
          <Field label="Time" type="time" required error={errors.time?.message} {...register('time')} />
          <SelectField label="Length" {...register('durationMinutes')}>
            {DURATIONS.map((m) => <option key={m} value={m}>{lengthLabel(m)}</option>)}
          </SelectField>
        </div>
        <Field label="Anything we should know? (optional)" error={errors.notes?.message} {...register('notes')} />
        {request.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{request.error.message}</p>}
        <Button type="submit" loading={request.isPending}>{request.isPending ? 'Sending…' : 'Send request'}</Button>
      </form>

      <DataTable
        caption="My appointments"
        columns={columns}
        rows={data?.data}
        rowKey={(a) => a.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: CalendarClock, title: 'No appointments yet', hint: 'Use the form above to ask for one.' }}
        actions={(a) => (a.status === 'requested' || a.status === 'confirmed') && <button type="button" className="link-danger" disabled={cancel.isPending} onClick={() => handleCancel(a)}>Cancel</button>}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
      />
    </>
  )
}
