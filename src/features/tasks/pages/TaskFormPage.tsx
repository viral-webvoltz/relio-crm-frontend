import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSection } from '@/components/ui/FormSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { UserSelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { relatedRoutes, relatedTypes, type RelatedType } from '@/features/activities/types'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useSaveTask, useTask } from '../hooks/useTasks'
import { emptyTask, taskFormSchema, type TaskFormValues } from '../schemas/taskSchema'
import { taskPriorities, taskRecurrences, taskStatuses } from '../types'

export function TaskFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: me } = useCurrentUser()
  const { data: task, isPending, isError, error } = useTask(id)
  const save = useSaveTask(id)

  // A new task can be pre-linked from a record page (?relatedType=lead&relatedId=...).
  const queryType = searchParams.get('relatedType')
  const link =
    id || !queryType || !relatedTypes.includes(queryType as RelatedType) || !searchParams.get('relatedId')
      ? undefined
      : { relatedType: queryType as RelatedType, relatedId: searchParams.get('relatedId')! }
  const linked = task?.relatedType && task.relatedId ? { relatedType: task.relatedType, relatedId: task.relatedId } : link
  const backTo = linked ? `${relatedRoutes[linked.relatedType]}/${linked.relatedId}/edit` : '/tasks'

  const { register, control, handleSubmit, setError, formState: { errors, isDirty } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { ...emptyTask, assignedTo: me?.id ?? '' },
    values: task && {
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      priority: task.priority,
      status: task.status,
      recurrence: task.recurrence,
      assignedTo: task.assignedTo ?? '',
    },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>

  const onSubmit = (values: TaskFormValues) =>
    save.mutate({ values, link }, {
      onSuccess: () => {
        toast.success(id ? 'Task updated' : 'Task created')
        allowLeave()
        navigate(backTo)
      },
    })

  return (
    <>
      <PageHeader title={id ? 'Edit task' : 'New task'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        {linked && (
          <p className="text-sm text-muted">
            Linked to a <Link to={backTo} className="capitalize text-primary hover:underline">{linked.relatedType}</Link>
          </p>
        )}
        <FormSection title="Details">
          <Field label="Title" required error={errors.title?.message} {...register('title')} />
          <Field label="Description" error={errors.description?.message} {...register('description')} />
        </FormSection>
        <FormSection title="Schedule and assignment">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
            <SelectField label="Priority" {...register('priority')}>
              {taskPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Repeats" {...register('recurrence')}>
              {taskRecurrences.map((r) => <option key={r} value={r}>{r === 'none' ? 'Does not repeat' : r}</option>)}
            </SelectField>
            <UserSelect control={control} name="assignedTo" />
          </div>
          {id && (
            <SelectField label="Status" {...register('status')}>
              {taskStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          )}
          <p className="text-xs text-muted">A repeating task creates the next one automatically when you complete it.</p>
        </FormSection>
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to={backTo} className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
