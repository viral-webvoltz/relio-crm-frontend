import type { UseFormReturn } from 'react-hook-form'
import { ContactSelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import type { SubjectValues } from '../schemas/privacySchema'

// "Who is this about?": an email address (matches every contact and lead using it) or one chosen contact.
export function SubjectFields({ form }: { form: UseFormReturn<SubjectValues> }) {
  const { register, control, formState: { errors } } = form
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
      <Field label="Email address" type="email" inputMode="email" autoComplete="off" placeholder="name@example.com" hint="Finds every contact and lead that uses this address." error={errors.email?.message} {...register('email')} />
      <span className="text-sm text-muted sm:pt-9" aria-hidden>or</span>
      <ContactSelect control={control} name="contactId" label="Choose a contact" emptyLabel="No contact chosen" />
    </div>
  )
}
