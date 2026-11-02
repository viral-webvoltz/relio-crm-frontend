import { TableSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useCan } from '@/features/auth/hooks/useCan'
import { DueDate } from '@/features/tasks/components/DueDate'
import { useSetTaskStatus, useTasks } from '@/features/tasks/hooks/useTasks'
import { useActivities, useLogActivity } from '../hooks/useActivities'
import { activityFormSchema, type ActivityFormValues } from '../schemas/activitySchema'
import { activityTypes, type RelatedType } from '../types'
import { ActivityItem } from './ActivityItem'

// Open tasks plus the activity timeline for one record; drop it under any edit form.
export function RecordActivity({ relatedType, relatedId }: { relatedType: RelatedType; relatedId: string }) {
  const canViewTasks = useCan('tasks.view')
  const canCreateTask = useCan('tasks.create')
  const canUpdateTask = useCan('tasks.update')
  const canViewActivities = useCan('activities.view')
  const canLog = useCan('activities.create')

  const tasks = useTasks({ page: 1, search: '', status: 'open', assignee: '', relatedType, relatedId })
  const setStatus = useSetTaskStatus()
  const activities = useActivities(relatedType, relatedId, canViewActivities)
  const logActivity = useLogActivity(relatedType, relatedId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { type: 'note', subject: '', body: '' },
  })

  const onSubmit = (values: ActivityFormValues) =>
    logActivity.mutate(values, { onSuccess: () => reset(), onError: (e) => toast.error(e.message) })

  return (
    <div className="mt-6 grid max-w-4xl gap-6 lg:grid-cols-2">
      {canViewTasks && (
        <section className="card p-6" aria-labelledby="record-tasks">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="record-tasks" className="text-base font-semibold text-heading">Open tasks</h2>
            {canCreateTask && (
              <Link to={`/tasks/new?relatedType=${relatedType}&relatedId=${relatedId}`} className="link-action">Add task</Link>
            )}
          </div>
          {tasks.isPending ? (
            <TableSkeleton rows={2} />
          ) : tasks.isError ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{tasks.error.message}</p>
          ) : tasks.data.data.length === 0 ? (
            <p className="text-sm text-muted">No open tasks.</p>
          ) : (
            <ul className="space-y-3">
              {tasks.data.data.map((task) => (
                <li key={task.id} className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    disabled={!canUpdateTask || setStatus.isPending}
                    onChange={() => setStatus.mutate({ id: task.id, status: 'done' }, { onError: (e) => toast.error(e.message) })}
                    aria-label={`Mark "${task.title}" as done`}
                  />
                  <div>
                    <div className="text-heading">{task.title}</div>
                    <div className="text-xs text-muted"><DueDate dueDate={task.dueDate} isDone={false} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canViewActivities && (
        <section className="card p-6" aria-labelledby="record-timeline">
          <h2 id="record-timeline" className="mb-4 text-base font-semibold text-heading">Activity</h2>
          {canLog && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-5 space-y-3 border-b border-border/60 pb-5">
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <SelectField label="Type" {...register('type')}>
                  {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectField>
                <Field label="Subject" error={errors.subject?.message} {...register('subject')} />
              </div>
              <Field label="Details (optional)" error={errors.body?.message} {...register('body')} />
              <Button type="submit" loading={logActivity.isPending}>{logActivity.isPending ? 'Logging…' : 'Log activity'}</Button>
            </form>
          )}
          {activities.isPending ? (
            <TableSkeleton rows={2} />
          ) : activities.isError ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{activities.error.message}</p>
          ) : activities.data.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ol className="space-y-4">
              {activities.data.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}
