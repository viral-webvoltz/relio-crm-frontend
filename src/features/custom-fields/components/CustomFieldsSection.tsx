import type { FieldError, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { SelectField } from '@/components/ui/SelectField'
import { useCustomFieldDefinitions } from '../hooks/useCustomFields'
import { entityLabel, type EntityType } from '../types'

type Props<T extends FieldValues> = { entity: EntityType; register: UseFormRegister<T>; errors: FieldErrors<T> }

// The fields an organisation added for this record type, rendered by type. Values live under `customFields.<key>` in the form,
// so a form only needs `customFields` in its schema, this section, `prepareCustomFields` on submit and `useCustomFieldErrors`.
export function CustomFieldsSection<T extends FieldValues>({ entity, register, errors }: Props<T>) {
  const { data: definitions } = useCustomFieldDefinitions(entity)
  if (!definitions?.length) return null
  const fieldErrors = (errors as FieldErrors<FieldValues>).customFields as Record<string, FieldError | undefined> | undefined

  return (
    <FormSection title="Additional details">
      {definitions.map((def) => {
        const name = `customFields.${def.key}` as Path<T>
        const error = fieldErrors?.[def.key]?.message
        switch (def.type) {
          case 'boolean':
            return <Checkbox key={def.id} label={def.label} {...register(name)} />
          case 'select':
            return (
              <SelectField key={def.id} label={def.label} required={def.required} error={error} {...register(name)}>
                <option value="">{def.required ? 'Choose…' : 'Not set'}</option>
                {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </SelectField>
            )
          case 'number':
            return <Field key={def.id} label={def.label} required={def.required} type="number" inputMode="decimal" step="any" error={error} {...register(name)} />
          case 'date':
            return <Field key={def.id} label={def.label} required={def.required} type="date" error={error} {...register(name)} />
          default:
            return <Field key={def.id} label={def.label} required={def.required} maxLength={500} autoComplete="off" error={error} {...register(name)} />
        }
      })}
      <p className="text-xs text-muted">These extra {entityLabel[entity].singular} details are set up by an administrator under Settings → Custom fields.</p>
    </FormSection>
  )
}
