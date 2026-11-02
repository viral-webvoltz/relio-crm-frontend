import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { UserSelect } from '@/components/entity/EntitySelects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { formatAmount, periodText } from '../format'
import { useGoal, useOwnerNames, useSaveGoal } from '../hooks/useGoals'
import { emptyGoal, goalFormSchema, targetToWire, toCreatePayload, toFormValues, type GoalFormValues } from '../schemas/goalSchema'
import { isMoneyMetric, metricInfo, metrics, periodTypes, type GoalDetail } from '../types'

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'
const PERIOD_NOUN = { month: 'month', quarter: 'quarter', year: 'year' } as const

function GoalForm({ goal }: { goal?: GoalDetail }) {
  const navigate = useNavigate()
  const names = useOwnerNames()
  const save = useSaveGoal(goal?.id)
  const { register, handleSubmit, control, watch, setError, formState: { errors, isDirty } } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goal ? toFormValues(goal) : emptyGoal(),
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  const metric = watch('metric')
  const scopeType = watch('scopeType')
  const period = watch('period')
  const money = isMoneyMetric(metric)

  const done = () => {
    allowLeave()
    toast.success(goal ? 'Goal updated' : 'Goal created')
    navigate('/goals')
  }
  const onSubmit = (v: GoalFormValues) =>
    goal ? save.mutate({ changes: { name: v.name.trim(), target: targetToWire(goal.metric, v.target) } }, { onSuccess: done }) : save.mutate({ create: toCreatePayload(v) }, { onSuccess: done })

  const owner = goal ? (goal.scopeType === 'organization' ? 'Whole organisation' : goal.scopeType === 'team' ? names.teamName(goal.teamId) : names.userName(goal.userId)) : ''

  return (
    <>
      <PageHeader title={goal ? 'Edit goal' : 'New goal'} subtitle={goal ? 'You can change the name and the target. What it measures, who it is for and when are fixed.' : 'Set a target. Progress is counted automatically from your real data.'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-7 p-7">
        <FormSection title="Goal">
          <Field label="Name" required autoComplete="off" placeholder="e.g. Q3 revenue" error={errors.name?.message} {...register('name')} />
        </FormSection>

        {goal ? (
          <dl className="space-y-1 rounded-xl bg-background/70 p-4 text-sm">
            <div className="flex gap-2"><dt className="w-24 text-muted">Measures</dt><dd className="font-medium text-heading">{metricInfo(goal.metric)?.label}</dd></div>
            <div className="flex gap-2"><dt className="w-24 text-muted">For</dt><dd className="font-medium text-heading">{owner}</dd></div>
            <div className="flex gap-2"><dt className="w-24 text-muted">Period</dt><dd className="font-medium text-heading">{periodText(goal)}</dd></div>
            <div className="flex gap-2"><dt className="w-24 text-muted">So far</dt><dd className="font-medium text-heading">{formatAmount(goal.metric, goal.progress.actual, goal.currency)}</dd></div>
          </dl>
        ) : (
          <>
            <FormSection title="What to measure">
              <SelectField label="Measure" required error={errors.metric?.message} {...register('metric')}>
                {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </SelectField>
              {money && <Field label="Currency" required hint="3-letter code, like USD. Only deals and orders in this currency count." autoCapitalize="characters" maxLength={3} autoComplete="off" error={errors.currency?.message} {...register('currency')} />}
            </FormSection>

            <FormSection title="Who it is for">
              <SelectField label="This goal is for" required {...register('scopeType')}>
                <option value="organization">The whole organisation</option>
                <option value="team">A team</option>
                <option value="user">One person</option>
              </SelectField>
              {scopeType === 'user' && <UserSelect control={control} name="userId" label="Person" required error={errors.userId?.message} emptyLabel="Choose a person" />}
              {scopeType === 'team' &&
                (names.canSeeTeams ? (
                  <SelectField label="Team" required error={errors.teamId?.message} {...register('teamId')}>
                    <option value="">Choose a team…</option>
                    {names.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </SelectField>
                ) : (
                  <p className="text-sm text-muted">Only administrators who manage teams can pick a team here.</p>
                ))}
            </FormSection>

            <FormSection title="When">
              <SelectField label="Period" required {...register('period')}>
                {periodTypes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </SelectField>
              {period === 'custom' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Starts" type="date" required error={errors.startDate?.message} {...register('startDate')} />
                  <Field label="Ends" type="date" required error={errors.endDate?.message} {...register('endDate')} />
                </div>
              ) : (
                <Field label={`Which ${PERIOD_NOUN[period]}?`} type="date" required hint={`Pick any day inside the ${PERIOD_NOUN[period]} you mean.`} error={errors.on?.message} {...register('on')} />
              )}
            </FormSection>
          </>
        )}

        <FormSection title="Target">
          <Field
            label="Target"
            required
            inputMode={money ? 'decimal' : 'numeric'}
            autoComplete="off"
            placeholder={money ? '50000' : '20'}
            hint={money ? `Amount${goal?.currency || watch('currency') ? ` in ${(goal?.currency || watch('currency')).toUpperCase()}` : ''}, for example 50000` : 'A whole number, for example 20'}
            error={errors.target?.message}
            {...register('target')}
          />
        </FormSection>

        {save.error && <p role="alert" className={alertClass}>{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending} disabled={save.isSuccess}>{save.isPending ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}</Button>
          <Link to="/goals" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}

export function GoalFormPage() {
  const { id } = useParams()
  const canManage = useCan('goals.manage')
  const goal = useGoal(id)

  if (!canManage) return <p role="alert" className={alertClass}>Your role can view goals but not change them.</p>
  if (!id) return <GoalForm />
  if (goal.isPending) return <PageSkeleton />
  if (goal.isError) return <div className="card"><ErrorState message={goal.error.message} onRetry={() => goal.refetch()} /></div>
  return <GoalForm goal={goal.data} />
}
