import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import type { Organization } from '../api'
import { useOrganization, useUpdateOrganization } from '../hooks/useOrganization'

// Intl leaves out plain UTC, which is what every organization starts on.
const timezones: string[] = ['UTC', ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])]

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(100, 'At most 100 characters'),
  timezone: z.string().min(1, 'Choose a timezone'),
})
type Values = z.infer<typeof schema>

function OrganizationForm({ org }: { readonly org: Organization }) {
  // A saved zone this browser does not know (older or custom) still has to be selectable.
  const options = timezones.includes(org.timezone) ? timezones : [org.timezone, ...timezones]
  const save = useUpdateOrganization()
  const canEdit = useCan('settings.manage')
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), values: { name: org.name, timezone: org.timezone } })
  useServerFieldErrors(save.error, setError)
  // Once the save lands the form resets to the saved values, so the guard switches itself off.
  useUnsavedGuard(isDirty)

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: () => toast.success('Organization saved') }))} noValidate className="card space-y-5 p-7">
      <fieldset disabled={!canEdit} className="grid gap-5 md:grid-cols-2">
      <Field label="Organization name" required error={errors.name?.message} {...register('name')} />
      <SelectField
        label="Timezone"
        required
        hint="The clock for scheduled workflows, subscriptions, goals and working hours."
        error={errors.timezone?.message}
        {...register('timezone')}
      >
        {options.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
      </SelectField>
      </fieldset>
      {!canEdit && <p className="text-sm text-muted">Only people who manage settings can change these.</p>}
      {save.error && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
      {canEdit && <Button type="submit" loading={save.isPending} disabled={!isDirty && !save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>}
    </form>
  )
}

export function OrganizationPage() {
  const { data: org, isPending, isError, error, refetch } = useOrganization()
  return (
    <>
      <PageHeader title="Organization" subtitle="Your workspace name and clock." />
      {isPending ? (
        <PageSkeleton />
      ) : isError ? (
        <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
      ) : (
        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="org-facts">
            <h2 id="org-facts" className="mb-3 text-base font-semibold text-heading">About this workspace</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted">Sign-in ID</dt><dd className="break-all font-medium text-heading">{org.slug}</dd></div>
              <div><dt className="text-muted">People</dt><dd className="font-medium text-heading">{org.memberCount}</dd></div>
              <div><dt className="text-muted">Created</dt><dd className="font-medium text-heading">{format(parseISO(org.createdAt), 'd MMM yyyy')}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">The sign-in ID is used on the login page and in customer portal links, so it cannot be changed.</p>
          </section>
          <OrganizationForm org={org} />
        </div>
      )}
    </>
  )
}
