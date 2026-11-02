import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useDeleteSchedule, useSaveSchedule, useSavedReports, useSchedules, useToggleSchedule } from '../hooks/useReports'
import { hourLabel, localHint, weekdayName, whenText } from '../text'
import type { Frequency, SavedReport, Schedule, SchedulePayload } from '../types'

const MAX_RECIPIENTS = 10
const emailCheck = z.email()
const splitEmails = (text: string) => [...new Set(text.split(/[\s,;]+/).filter(Boolean).map((e) => e.toLowerCase()))]

const schema = z
  .object({
    savedReportId: z.string().min(1, 'Choose which report to send'),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    hourUtc: z.string(),
    dayOfWeek: z.string(),
    dayOfMonth: z.string(),
    recipients: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const emails = splitEmails(v.recipients)
    if (emails.length === 0) ctx.addIssue({ code: 'custom', path: ['recipients'], message: 'Add at least one email address' })
    else if (emails.length > MAX_RECIPIENTS) ctx.addIssue({ code: 'custom', path: ['recipients'], message: `Send to at most ${MAX_RECIPIENTS} people` })
    else {
      const bad = emails.find((e) => !emailCheck.safeParse(e).success)
      if (bad) ctx.addIssue({ code: 'custom', path: ['recipients'], message: `“${bad}” is not a valid email address` })
    }
  })
type Values = z.infer<typeof schema>

const toPayload = (v: Values): SchedulePayload => ({
  savedReportId: v.savedReportId,
  frequency: v.frequency,
  hourUtc: Number(v.hourUtc),
  ...(v.frequency === 'weekly' && { dayOfWeek: Number(v.dayOfWeek) }),
  ...(v.frequency === 'monthly' && { dayOfMonth: Number(v.dayOfMonth) }),
  recipients: splitEmails(v.recipients),
  isActive: v.isActive,
})

const hours = Array.from({ length: 24 }, (_, h) => h)

type Editing = { schedule?: Schedule; savedId?: string }

function ScheduleDialog({ editing, savedReports, onClose }: { editing: Editing; savedReports: SavedReport[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { data: me } = useCurrentUser()
  const existing = editing.schedule
  const save = useSaveSchedule(existing?.id)
  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      savedReportId: existing?.savedReportId ?? editing.savedId ?? '',
      frequency: existing?.frequency ?? 'weekly',
      hourUtc: String(existing?.hourUtc ?? 9),
      dayOfWeek: String(existing?.dayOfWeek ?? 1),
      dayOfMonth: String(existing?.dayOfMonth ?? 1),
      recipients: existing?.recipients.join(', ') ?? '',
      isActive: existing?.isActive ?? true,
    },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  const frequency = watch('frequency') as Frequency
  const hour = Number(watch('hourUtc'))

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  // Closing with typed-in changes asks first, like leaving any other form.
  const requestClose = async () => {
    if (isDirty && !save.isSuccess && !(await confirmDialog('Close without saving? Your changes to this schedule will be lost.', { title: 'Discard changes?', confirmLabel: 'Discard' }))) return
    allowLeave()
    dialog.current?.close()
  }

  const onSubmit = (values: Values) =>
    save.mutate(toPayload(values), {
      onSuccess: () => {
        allowLeave()
        toast.success(existing ? 'Schedule updated' : 'Schedule created')
        dialog.current?.close()
      },
      // The server's message names which addresses are not users here.
      onError: (e) => e.code === 'RECIPIENT_NOT_ALLOWED' && setError('recipients', { type: 'server', message: e.message }, { shouldFocus: true }),
    })

  const addMe = () => {
    if (!me?.email) return
    const current = splitEmails(watch('recipients'))
    if (!current.includes(me.email.toLowerCase())) setValue('recipients', [...current, me.email.toLowerCase()].join(', '), { shouldDirty: true, shouldValidate: true })
  }

  const generalError = save.error && !errors.recipients && save.error.code !== 'VALIDATION_ERROR' ? save.error.message : ''

  return (
    <dialog
      ref={dialog}
      aria-labelledby="schedule-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        void requestClose()
      }}
      onClick={(e) => e.target === dialog.current && void requestClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
        <h2 id="schedule-title" className="text-lg font-semibold text-heading">{existing ? 'Edit email schedule' : 'New email schedule'}</h2>
        <p className="text-sm text-body">We email the report, with fresh numbers each time, to the people you choose.</p>

        {existing ? (
          <p className="text-sm text-body">Report: <span className="font-medium text-heading">{savedReports.find((r) => r.id === existing.savedReportId)?.name ?? 'Saved report'}</span></p>
        ) : (
          <SelectField label="Report" required error={errors.savedReportId?.message} hint={savedReports.length === 0 ? 'Save a report first, then come back to schedule it.' : undefined} {...register('savedReportId')}>
            <option value="">Choose a saved report…</option>
            {savedReports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </SelectField>
        )}

        <SelectField label="How often" required {...register('frequency')}>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
        </SelectField>

        {frequency === 'weekly' && (
          <SelectField label="On" error={errors.dayOfWeek?.message} {...register('dayOfWeek')}>
            {[1, 2, 3, 4, 5, 6, 0].map((n) => <option key={n} value={n}>{weekdayName(n)}</option>)}
          </SelectField>
        )}
        {frequency === 'monthly' && (
          <SelectField label="On day" hint="Days 1 to 28, so every month has it." error={errors.dayOfMonth?.message} {...register('dayOfMonth')}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </SelectField>
        )}

        <SelectField label="Time (UTC)" hint={`${hourLabel(hour)} is ${localHint(hour)} today. Times are in UTC.`} {...register('hourUtc')}>
          {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </SelectField>

        <div className="space-y-2">
          <Field label="Send to" required autoComplete="off" placeholder="name@yourcompany.com, other@yourcompany.com" hint={`Only people who have an account here can get reports. Separate up to ${MAX_RECIPIENTS} addresses with commas.`} error={errors.recipients?.message} {...register('recipients')} />
          {me?.email && <button type="button" className="link-action" onClick={addMe}>Add my email ({me.email})</button>}
        </div>

        <Checkbox label="Active" {...register('isActive')} />

        {generalError && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{generalError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => void requestClose()}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={save.isPending || save.isSuccess}>{existing ? 'Save changes' : 'Create schedule'}</Button>
        </div>
      </form>
    </dialog>
  )
}

type Props = { canView: (type: SavedReport['reportType']) => boolean; startFor: string | null; onStarted: () => void }

// Emailed reports: pick a saved report, how often, and who gets it.
export function Schedules({ canView, startFor, onStarted }: Props) {
  const schedules = useSchedules()
  const saved = useSavedReports()
  const toggle = useToggleSchedule()
  const remove = useDeleteSchedule()
  const [editing, setEditing] = useState<Editing | null>(null)

  useEffect(() => {
    if (!startFor) return
    setEditing({ savedId: startFor })
    onStarted()
  }, [startFor, onStarted])

  const nameOf = (id: string) => saved.data?.find((r) => r.id === id)?.name ?? 'Saved report'
  const schedulable = (saved.data ?? []).filter((r) => canView(r.reportType))

  const handleToggle = (s: Schedule) =>
    toggle.mutate({ id: s.id, isActive: !s.isActive }, { onSuccess: () => toast.success(s.isActive ? 'Schedule paused' : 'Schedule resumed'), onError: (e) => toast.error(e.message) })

  const handleDelete = async (s: Schedule) => {
    if (!(await confirmDialog(`Delete this schedule for "${nameOf(s.savedReportId)}"? The report stops being emailed. The saved report stays.`, { title: 'Delete schedule?' }))) return
    remove.mutate(s.id, { onSuccess: () => toast.success('Schedule deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Schedule>[] = [
    { key: 'report', header: 'Report', primary: true, cell: (s) => <span className="font-medium text-heading">{nameOf(s.savedReportId)}</span> },
    { key: 'when', header: 'When', cell: (s) => whenText(s) },
    { key: 'to', header: 'Sent to', cell: (s) => <span className="break-words">{s.recipients.join(', ')}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <>
          <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'active' : 'paused'}</Badge>
          <div className="mt-1 text-xs text-muted">{s.lastRunAt ? `Last sent ${format(parseISO(s.lastRunAt), 'd MMM yyyy, HH:mm')}` : 'Not sent yet'}</div>
          {s.isActive && <div className="text-xs text-muted">Next: {format(parseISO(s.nextRunAt), 'd MMM yyyy, HH:mm')}</div>}
        </>
      ),
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">Get a report in your inbox on a schedule. Reports go only to people who have an account here.</p>
        <button type="button" className="btn-primary" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden /> New schedule
        </button>
      </div>
      <DataTable
        caption="Email schedules"
        columns={columns}
        rows={schedules.data}
        rowKey={(s) => s.id}
        loading={schedules.isPending}
        refreshing={schedules.isFetching}
        error={schedules.isError ? schedules.error : null}
        onRetry={() => schedules.refetch()}
        empty={{ title: 'No email schedules yet.', hint: 'Create one to get a saved report by email every day, week or month.' }}
        actions={(s) => (
          <>
            <button type="button" className="link-action" disabled={toggle.isPending} onClick={() => handleToggle(s)}>{s.isActive ? 'Pause' : 'Resume'}</button>
            <button type="button" className="link-action" onClick={() => setEditing({ schedule: s })}>Edit</button>
            <button type="button" className="link-danger" onClick={() => handleDelete(s)}>Delete</button>
          </>
        )}
      />
      {editing && <ScheduleDialog key={editing.schedule?.id ?? editing.savedId ?? 'new'} editing={editing} savedReports={schedulable} onClose={() => setEditing(null)} />}
    </>
  )
}
