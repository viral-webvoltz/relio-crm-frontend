import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { usePortalChangePassword, usePortalMe } from '../hooks/usePortal'
import { changePasswordSchema, type ChangePasswordValues } from '../schemas/portalSchema'

export function PortalChangePasswordPage() {
  const { data: customer } = usePortalMe()
  const change = usePortalChangePassword()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = (values: ChangePasswordValues) =>
    change.mutate(values, { onSuccess: () => { toast.success('Password changed. Other devices were signed out.'); reset() } })

  return (
    <section className="card mx-auto max-w-md p-6" aria-labelledby="change-password">
      <h1 id="change-password" className="text-xl font-semibold text-heading">Change password</h1>
      {customer?.mustChangePassword && <p className="mt-2 text-sm text-muted">Your password was set by our team. Please choose your own before continuing.</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
        <Field label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <Field label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {change.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{change.error.message}</p>}
        <Button type="submit" className="w-full" loading={change.isPending}>{change.isPending ? 'Saving…' : 'Change password'}</Button>
      </form>
    </section>
  )
}
