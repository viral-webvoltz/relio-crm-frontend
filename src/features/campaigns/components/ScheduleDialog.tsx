import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { campaignMessage } from '../errors'
import { useScheduleCampaign } from '../hooks/useCampaigns'
import { FormDialog } from './FormDialog'

const DAY = 86_400_000
const schema = z.object({ date: z.string().min(1, 'Pick a day'), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a time') }).superRefine((v, ctx) => {
  const at = new Date(`${v.date}T${v.time}`).getTime()
  if (Number.isNaN(at)) return
  if (at <= Date.now()) ctx.addIssue({ code: 'custom', path: ['time'], message: 'Pick a time in the future' })
  else if (at > Date.now() + 365 * DAY) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Pick a day within the next year' })
})

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

// Scheduling is reversible until the send starts (Cancel puts the campaign back to draft), but once it goes out it cannot be recalled.
export function ScheduleDialog({ campaignId, people, label, disabled }: { campaignId: string; people: number | undefined; label: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const schedule = useScheduleCampaign(campaignId)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { date: '', time: '09:00' } })
  const close = () => {
    setOpen(false)
    schedule.reset()
  }
  return (
    <>
      <button type="button" className="btn-ghost gap-1.5" disabled={disabled} onClick={() => { reset(); setOpen(true) }}>
        <CalendarClock className="size-4" aria-hidden /> {label}
      </button>
      <FormDialog open={open} onClose={close} titleId="campaign-schedule-title">
        <form
          noValidate
          className="space-y-4 p-6"
          onSubmit={handleSubmit(({ date, time }) => {
            const at = new Date(`${date}T${time}`)
            schedule.mutate(at.toISOString(), {
              onSuccess: () => {
                toast.success('Campaign scheduled', { description: `It will go out on ${at.toLocaleString()}.` })
                close()
              },
            })
          })}
        >
          <h2 id="campaign-schedule-title" className="text-lg font-semibold text-heading">Schedule this campaign</h2>
          <p className="text-sm text-body">
            {people === undefined ? 'It will be emailed to your audience' : `It will be emailed to about ${people.toLocaleString()} ${people === 1 ? 'person' : 'people'}`} at the time you choose ({zone} time). You can cancel the schedule until it starts. Once the emails are on their way they cannot be called back.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Day" type="date" required error={errors.date?.message} {...register('date')} />
            <Field label="Time" type="time" required error={errors.time?.message} {...register('time')} />
          </div>
          {schedule.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{campaignMessage(schedule.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" loading={schedule.isPending}>{schedule.isPending ? 'Scheduling…' : 'Schedule'}</Button>
          </div>
        </form>
      </FormDialog>
    </>
  )
}
