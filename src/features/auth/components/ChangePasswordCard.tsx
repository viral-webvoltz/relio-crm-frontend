import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useChangePassword } from '../hooks/useAccount'
import { changePasswordSchema, type ChangePasswordValues } from '../schemas/authSchemas'
import { PasswordStrength } from './PasswordStrength'

const empty: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordCard() {
  const queryClient = useQueryClient()
  const change = useChangePassword()
  const { register, handleSubmit, reset, watch, setError, formState: { errors, isDirty } } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: empty })
  useUnsavedGuard(isDirty)

  const onSubmit = (values: ChangePasswordValues) =>
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed. Your other devices were signed out.')
          reset(empty)
          void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] })
        },
        // A wrong current password belongs on that field, not in a general banner.
        onError: (e) => e.code === 'INVALID_CURRENT_PASSWORD' && setError('currentPassword', { message: 'That is not your current password' }, { shouldFocus: true }),
      },
    )

  const generalError = change.error && change.error.code !== 'INVALID_CURRENT_PASSWORD' ? change.error.message : ''

  return (
    <section className="card p-6" aria-labelledby="change-password">
      <h2 id="change-password" className="text-base font-semibold text-heading">Change password</h2>
      <p className="mb-4 mt-1 text-sm text-muted">Changing it signs out every other device. You stay signed in here.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-md space-y-4">
        <Field label="Current password" required type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <Field label="New password" required type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordStrength value={watch('newPassword') ?? ''} />
        <Field label="Confirm new password" required type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {generalError && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{generalError}</p>}
        <Button type="submit" loading={change.isPending}>{change.isPending ? 'Saving…' : 'Change password'}</Button>
      </form>
    </section>
  )
}
