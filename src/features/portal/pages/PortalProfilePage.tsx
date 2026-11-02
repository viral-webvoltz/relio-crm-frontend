import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { usePortalChangePassword } from '../hooks/usePortal'
import { useProfile, useUpdateProfile } from '../hooks/usePortalExtras'
import { changePasswordSchema, type ChangePasswordValues } from '../schemas/portalSchema'

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(100, 'Keep it under 100 characters'),
  lastName: z.string().trim().max(100, 'Keep it under 100 characters'),
  phone: z.string().trim().max(40, 'Keep it under 40 characters'),
})
type ProfileValues = z.infer<typeof profileSchema>

export function PortalProfilePage() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const change = usePortalChangePassword()

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', phone: '' },
    values: profile.data && { firstName: profile.data.firstName, lastName: profile.data.lastName ?? '', phone: profile.data.phone ?? '' },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(update.error, setError)

  const password = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })

  if (profile.isPending) return <PageSkeleton />
  if (profile.isError) return <div className="card"><ErrorState message={profile.error.message} onRetry={() => profile.refetch()} /></div>

  // Only these three fields are sent; the email and account are managed by our team.
  const onSave = (v: ProfileValues) =>
    update.mutate({ firstName: v.firstName, lastName: v.lastName || null, phone: v.phone || null }, { onSuccess: () => { allowLeave(); toast.success('Your details were saved') } })

  const onChangePassword = (v: ChangePasswordValues) =>
    change.mutate(v, { onSuccess: () => { toast.success('Password changed. Other devices were signed out.'); password.reset() } })

  const pwErrors = password.formState.errors

  return (
    <>
      <PageHeader title="My details" subtitle={profile.data.email} />
      <form onSubmit={handleSubmit(onSave)} noValidate className="card mb-6 max-w-xl space-y-4 p-6">
        <h2 className="text-base font-semibold text-heading">Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <Field label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Field label="Phone" type="tel" autoComplete="tel" hint="To change your email address, please contact us." error={errors.phone?.message} {...register('phone')} />
        {update.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{update.error.message}</p>}
        <Button type="submit" disabled={update.isPending || !isDirty}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
      </form>

      <form onSubmit={password.handleSubmit(onChangePassword)} noValidate className="card max-w-xl space-y-4 p-6">
        <h2 className="text-base font-semibold text-heading">Change password</h2>
        <p className="text-sm text-muted">Changing your password signs you out on your other devices.</p>
        <Field label="Current password" type="password" required autoComplete="current-password" error={pwErrors.currentPassword?.message} {...password.register('currentPassword')} />
        <Field label="New password" type="password" required autoComplete="new-password" hint="At least 8 characters" error={pwErrors.newPassword?.message} {...password.register('newPassword')} />
        <Field label="Confirm new password" type="password" required autoComplete="new-password" error={pwErrors.confirmPassword?.message} {...password.register('confirmPassword')} />
        {change.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{change.error.message}</p>}
        <Button type="submit" loading={change.isPending}>{change.isPending ? 'Saving…' : 'Change password'}</Button>
      </form>
    </>
  )
}
