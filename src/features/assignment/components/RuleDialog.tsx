import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { SelectField } from '@/components/ui/SelectField'
import { DialogShell } from '@/features/teams/components/DialogShell'
import type { Team } from '@/features/teams/types'
import { needsValue, type Operator } from '@/features/workflows/graph'
import type { FieldMeta } from '@/features/workflows/types'
import { type ApiError } from '@/lib/httpClient'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { resources, ruleOperators } from '../fields'
import { useSaveRule } from '../hooks/useAssignment'
import { strategyLabel, type Resource, type Rule, type RulePayload } from '../types'

type Person = { id: string; fullName: string }

const MAX_CONDITIONS = 20

const schema = z
  .object({
    name: z.string().trim().min(1, 'Give the rule a name').max(100, 'Keep the name under 100 characters'),
    isActive: z.boolean(),
    mode: z.enum(['all', 'any']),
    conditions: z
      .array(
        z.object({
          field: z.string().trim().regex(/^[A-Za-z0-9_.]{1,60}$/, 'Choose a field'),
          operator: z.string(),
          value: z.string().max(200, 'Keep the value under 200 characters'),
        }),
      )
      .max(MAX_CONDITIONS, `Use at most ${MAX_CONDITIONS} conditions`),
    targetType: z.enum(['user', 'team']),
    userId: z.string(),
    teamId: z.string(),
    strategy: z.enum(['round_robin', 'least_loaded']),
  })
  .superRefine((v, ctx) => {
    v.conditions.forEach((c, i) => {
      if (needsValue(c.operator) && !c.value.trim()) ctx.addIssue({ code: 'custom', path: ['conditions', i, 'value'], message: 'Enter a value' })
      if (['gt', 'gte', 'lt', 'lte'].includes(c.operator) && c.value.trim() && !Number.isFinite(Number(c.value))) ctx.addIssue({ code: 'custom', path: ['conditions', i, 'value'], message: 'Enter a number' })
    })
    if (v.targetType === 'user' && !v.userId) ctx.addIssue({ code: 'custom', path: ['userId'], message: 'Choose who gets these' })
    if (v.targetType === 'team' && !v.teamId) ctx.addIssue({ code: 'custom', path: ['teamId'], message: 'Choose a team' })
  })
type Values = z.infer<typeof schema>

const toValues = (rule: Rule | null, teams: Team[]): Values => ({
  name: rule?.name ?? '',
  isActive: rule?.isActive ?? true,
  mode: rule?.conditions.mode ?? 'all',
  conditions: rule?.conditions.rules.map((c) => ({ field: c.field, operator: c.operator, value: c.value ?? '' })) ?? [],
  targetType: rule?.target.type ?? (teams.length > 0 ? 'team' : 'user'),
  userId: rule?.target.type === 'user' ? rule.target.userId : '',
  teamId: rule?.target.type === 'team' ? rule.target.teamId : '',
  strategy: rule?.target.type === 'team' ? rule.target.strategy : 'round_robin',
})

const toPayload = (resource: Resource, v: Values): RulePayload => ({
  resource,
  name: v.name.trim(),
  isActive: v.isActive,
  conditions: {
    mode: v.mode,
    rules: v.conditions.map((c) => ({ field: c.field.trim(), operator: c.operator as Operator, ...(needsValue(c.operator) && { value: c.value.trim() }) })),
  },
  target: v.targetType === 'user' ? { type: 'user', userId: v.userId } : { type: 'team', teamId: v.teamId, strategy: v.strategy },
})

type RowProps = { index: number; form: UseFormReturn<Values>; fields: FieldMeta[]; people: Person[]; onRemove: () => void }

// One "field / is / value" row. The value box follows the field: a list for choices and people, plain text otherwise.
function ConditionRow({ index, form, fields, people, onRemove }: RowProps) {
  const { register, watch, setValue, formState: { errors } } = form
  const field = watch(`conditions.${index}.field`)
  const operator = watch(`conditions.${index}.operator`)
  const meta = fields.find((f) => f.key === field)
  const err = errors.conditions?.[index]
  const known = fields.some((f) => f.key === field)
  return (
    <div className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <SelectField label="When this" error={err?.field?.message} {...register(`conditions.${index}.field`, { onChange: () => setValue(`conditions.${index}.value`, '') })}>
        <option value="">Choose a field…</option>
        {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        {field && !known && <option value={field}>{field}</option>}
      </SelectField>
      <SelectField label="Is" {...register(`conditions.${index}.operator`)}>
        {ruleOperators.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
      {needsValue(operator) ? (
        meta?.type === 'enum' ? (
          <SelectField label="Value" error={err?.value?.message} {...register(`conditions.${index}.value`)}>
            <option value="">Choose…</option>
            {(meta.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </SelectField>
        ) : meta?.type === 'user' ? (
          <SelectField label="Value" error={err?.value?.message} {...register(`conditions.${index}.value`)}>
            <option value="">Choose a person…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </SelectField>
        ) : (
          <Field label="Value" autoComplete="off" type={meta?.type === 'number' ? 'number' : 'text'} error={err?.value?.message} {...register(`conditions.${index}.value`)} />
        )
      ) : (
        <p className="pb-2 text-sm text-muted">No value needed</p>
      )}
      <Button variant="ghost" aria-label={`Remove condition ${index + 1}`} onClick={onRemove}><Trash2 className="size-4" aria-hidden /></Button>
    </div>
  )
}

type Props = { resource: Resource; rule: Rule | null; people: Person[]; teams: Team[]; fields: FieldMeta[]; onClose: () => void }

function RuleForm({ resource, rule, people, teams, fields, close }: Omit<Props, 'onClose'> & { close: () => void }) {
  const save = useSaveRule(rule?.id)
  const [error, setError] = useState<ApiError | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(rule, teams) })
  const { register, handleSubmit, control, watch, setError: setFieldError, formState: { errors, isDirty } } = form
  const rows = useFieldArray({ control, name: 'conditions' })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(error, setFieldError)

  const targetType = watch('targetType')
  const team = teams.find((t) => t.id === watch('teamId'))
  const noun = resources.find((r) => r.key === resource)!.noun

  const onSubmit = (v: Values) => {
    setError(null)
    const payload = toPayload(resource, v)
    const { resource: _resource, ...changes } = payload
    save.mutate(rule ? changes : payload, {
      onSuccess: () => {
        allowLeave()
        toast.success(rule ? 'Rule updated' : 'Rule created')
        close()
      },
      onError: setError,
    })
  }

  const cancel = async () => {
    if (isDirty && !(await confirmDialog('You have changes that are not saved. Close without saving?', { title: 'Discard changes?', confirmLabel: 'Discard' }))) return
    allowLeave()
    close()
  }

  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <FormSection title="Rule">
        <Field label="Rule name" required autoComplete="off" maxLength={100} placeholder="e.g. Website leads to Sales" error={errors.name?.message} {...register('name')} />
        <Checkbox label="Turned on" {...register('isActive')} />
      </FormSection>

      <FormSection title={`Which ${noun[1]}`}>
        <p className="text-sm text-muted">Leave this empty to match every new {noun[0]}.</p>
        {rows.fields.length > 1 && (
          <SelectField label="A new item matches when" {...register('mode')}>
            <option value="all">All of these are true</option>
            <option value="any">Any one of these is true</option>
          </SelectField>
        )}
        {rows.fields.map((row, i) => <ConditionRow key={row.id} index={i} form={form} fields={fields} people={people} onRemove={() => rows.remove(i)} />)}
        {errors.conditions?.message && <p role="alert" className="text-xs text-destructive">{errors.conditions.message}</p>}
        <Button variant="ghost" disabled={rows.fields.length >= MAX_CONDITIONS} onClick={() => rows.append({ field: '', operator: 'equals', value: '' })}>
          <Plus className="size-4" aria-hidden /> Add a condition
        </Button>
      </FormSection>

      <FormSection title="Give it to">
        <fieldset className="space-y-2">
          <legend className="sr-only">Who gets it</legend>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm has-checked:border-primary/40 has-checked:bg-primary-soft">
              <input type="radio" value="team" className="size-4 accent-primary" {...register('targetType')} /> A team
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm has-checked:border-primary/40 has-checked:bg-primary-soft">
              <input type="radio" value="user" className="size-4 accent-primary" {...register('targetType')} /> One person
            </label>
          </div>
        </fieldset>
        {targetType === 'user' ? (
          <SelectField label="Person" required error={errors.userId?.message} {...register('userId')}>
            <option value="">Choose a person…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </SelectField>
        ) : (
          <>
            <SelectField label="Team" required error={errors.teamId?.message} hint={teams.length === 0 ? 'There are no teams yet. Create one on the Teams page first.' : undefined} {...register('teamId')}>
              <option value="">Choose a team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectField>
            {team && team.memberCount === 0 && <p role="status" className="text-xs text-warning">This team has no people yet, so this rule will be skipped until you add some.</p>}
            <SelectField label="How to choose within the team" {...register('strategy')}>
              {(Object.keys(strategyLabel) as (keyof typeof strategyLabel)[]).map((s) => <option key={s} value={s}>{strategyLabel[s]}</option>)}
            </SelectField>
          </>
        )}
      </FormSection>

      {error && error.code !== 'VALIDATION_ERROR' && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={cancel}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}</Button>
      </div>
    </form>
  )
}

// Create or edit a rule. Mounted only while open so the form starts fresh each time.
export function RuleDialog({ onClose, ...props }: Props) {
  return <DialogShell title={props.rule ? 'Edit rule' : 'New rule'} wide onClose={onClose}>{(close) => <RuleForm {...props} close={close} />}</DialogShell>
}
