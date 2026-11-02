import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Mail, Phone, StickyNote, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useCan } from '@/features/auth/hooks/useCan'
import { useDeleteActivity, useUpdateActivity } from '../hooks/useActivities'
import { activityFormSchema, type ActivityFormValues } from '../schemas/activitySchema'
import { activityTypes, type Activity } from '../types'

const typeIcons: Record<Activity['type'], LucideIcon> = { note: StickyNote, call: Phone, meeting: CalendarDays, email: Mail }

type ActivityItemProps = { activity: Activity; context?: ReactNode }

// One timeline entry that can be edited or deleted in place. `context` adds a line such as "on lead".
export function ActivityItem({ activity, context }: ActivityItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const canUpdate = useCan('activities.update')
  const canDelete = useCan('activities.delete')
  const update = useUpdateActivity()
  const remove = useDeleteActivity()
  const Icon = typeIcons[activity.type]

  const { register, handleSubmit, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { type: activity.type, subject: activity.subject, body: activity.body ?? '' },
  })

  const onSave = (values: ActivityFormValues) =>
    update.mutate({ id: activity.id, values }, { onSuccess: () => setIsEditing(false), onError: (e) => toast.error(e.message) })

  if (isEditing) {
    return (
      <li>
        <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-3 rounded-xl border border-border bg-background/60 p-3">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <SelectField label="Type" {...register('type')}>
              {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectField>
            <Field label="Subject" error={errors.subject?.message} {...register('subject')} />
          </div>
          <Field label="Details (optional)" error={errors.body?.message} {...register('body')} />
          <div className="flex gap-2">
            <Button type="submit" loading={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-heading"><span className="sr-only capitalize">{activity.type}: </span>{activity.subject}</div>
        {activity.body && <p className="text-body">{activity.body}</p>}
        <p className="text-xs text-muted">
          {format(parseISO(activity.occurredAt), 'd MMM yyyy, HH:mm')}
          {activity.createdByName && ` · ${activity.createdByName}`}
        </p>
        {context}
      </div>
      <div className="flex shrink-0 items-start">
        {canUpdate && <button type="button" className="link-action" onClick={() => setIsEditing(true)}>Edit</button>}
        {canDelete && (
          <button
            type="button"
            className="link-danger"
            onClick={async () => (await confirmDialog('Delete this activity?')) && remove.mutate(activity.id, { onError: (e) => toast.error(e.message) })}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  )
}
