import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useCreateDefinition, useUpdateDefinition } from '../hooks/useCustomFields'
import { entityLabel, fieldTypes, typeLabel, type CustomFieldDefinition, type EntityType } from '../types'

const parseOptions = (text: string) => text.split('\n').map((o) => o.trim()).filter(Boolean)

const schema = z
  .object({
    label: z.string().trim().min(1, 'Enter a name for the field').max(100, 'Keep it under 100 characters'),
    key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Use lowercase letters, numbers and underscores, starting with a letter'),
    type: z.enum(fieldTypes),
    optionsText: z.string(),
    required: z.boolean(),
    position: z.string().refine((v) => v === '' || (/^\d{1,5}$/.test(v) && Number(v) <= 10000), 'Use a whole number from 0 to 10000'),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'select') return
    const options = parseOptions(v.optionsText)
    const problem = options.length === 0 ? 'Add at least one option' : options.length > 50 ? 'Use at most 50 options' : options.some((o) => o.length > 100) ? 'Keep each option under 100 characters' : new Set(options).size !== options.length ? 'Each option must be different' : ''
    if (problem) ctx.addIssue({ code: 'custom', path: ['optionsText'], message: problem })
  })
type Values = z.infer<typeof schema>

// Turns "Customer tier" into customer_tier, the stable name stored with the data.
const slug = (label: string) => {
  const s = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  return /^[a-z]/.test(s) ? s : s ? `f_${s}`.slice(0, 40) : ''
}

type Props = { entity: EntityType; definition: CustomFieldDefinition | null; onClose: () => void }

// Create or edit one field. Mounted only while open, so the form starts fresh each time. A field's name (key) and type are fixed after creation.
export function DefinitionDialog({ entity, definition, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const create = useCreateDefinition()
  const update = useUpdateDefinition()
  const mutation = definition ? update : create
  const [keyTouched, setKeyTouched] = useState(false)
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: definition
      ? { label: definition.label, key: definition.key, type: definition.type, optionsText: (definition.options ?? []).join('\n'), required: definition.required, position: String(definition.position) }
      : { label: '', key: '', type: 'text', optionsText: '', required: false, position: '' },
  })
  useServerFieldErrors(mutation.error, setError)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const label = watch('label')
  useEffect(() => {
    if (!definition && !keyTouched) setValue('key', slug(label))
  }, [label, definition, keyTouched, setValue])

  const type = watch('type')
  const done = (message: string) => ({
    onSuccess: () => {
      toast.success(message)
      dialog.current?.close()
    },
  })

  const onSubmit = (v: Values) => {
    const options = v.type === 'select' ? parseOptions(v.optionsText) : undefined
    const position = v.position === '' ? undefined : Number(v.position)
    if (definition) update.mutate({ id: definition.id, changes: { label: v.label.trim(), required: v.required, ...(options && { options }), ...(position !== undefined && { position }) } }, done('Field updated'))
    else create.mutate({ entityType: entity, key: v.key, label: v.label.trim(), type: v.type, required: v.required, ...(options && { options }), ...(position !== undefined && { position }) }, done('Field added'))
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cf-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <form noValidate className="max-h-[85vh] space-y-4 overflow-y-auto p-6" onSubmit={handleSubmit(onSubmit)}>
        <h2 id="cf-dialog-title" className="text-lg font-semibold text-heading">{definition ? 'Edit field' : `New ${entityLabel[entity].singular} field`}</h2>
        <Field label="Name shown on the form" required autoComplete="off" placeholder="e.g. Customer tier" error={errors.label?.message} {...register('label')} />
        {definition ? (
          <p className="text-sm text-muted">Type: <span className="font-medium text-heading">{typeLabel[definition.type]}</span>. The type and the internal name (<code>{definition.key}</code>) cannot be changed after the field is created.</p>
        ) : (
          <>
            <SelectField label="Type" required {...register('type')}>
              {fieldTypes.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
            </SelectField>
            <Field
              label="Internal name"
              required
              autoComplete="off"
              hint="Used in saved data and exports. Fixed once created."
              error={errors.key?.message}
              {...register('key', { onChange: () => setKeyTouched(true) })}
            />
          </>
        )}
        {type === 'select' && (
          <div className="space-y-1.5">
            <label htmlFor="cf-options" className="text-sm font-medium text-heading">Options <span aria-hidden className="text-destructive">*</span></label>
            <textarea id="cf-options" rows={5} className="input-base h-auto py-2" aria-invalid={errors.optionsText ? true : undefined} aria-describedby="cf-options-hint" {...register('optionsText')} />
            <p id="cf-options-hint" className="text-xs text-muted">One option per line.</p>
            {errors.optionsText && <p role="alert" className="text-xs text-destructive">{errors.optionsText.message}</p>}
          </div>
        )}
        <Checkbox label="Required" {...register('required')} />
        <Field label="Order (optional)" type="number" min={0} max={10000} inputMode="numeric" hint="Smaller numbers appear first. Leave empty to add it at the end." error={errors.position?.message} {...register('position')} />
        {mutation.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{mutation.isPending ? 'Saving…' : definition ? 'Save changes' : 'Add field'}</Button>
        </div>
      </form>
    </dialog>
  )
}
