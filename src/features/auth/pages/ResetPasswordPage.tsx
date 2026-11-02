import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { AuthCard } from '../components/AuthCard'
import { PasswordStrength } from '../components/PasswordStrength'
import { useResetPassword } from '../hooks/useAuth'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/authSchemas'

// The emailed link is /reset-password?token=<64 hex characters>.
const TOKEN = /^[0-9a-f]{64}$/i

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const reset = useResetPassword()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  const expired = reset.error?.code === 'INVALID_RESET_TOKEN'
  if (!TOKEN.test(token) || expired) {
    return (
      <AuthCard title="This link does not work" subtitle="It may have expired or already been used">
        <p className="mb-4 text-sm text-body">Reset links are valid for a short time and work once. Ask for a new one and use the newest email.</p>
        <Link to="/forgot-password" className="btn-primary w-full">Get a new link</Link>
      </AuthCard>
    )
  }

  if (reset.isSuccess) {
    return (
      <AuthCard title="Password updated" subtitle="You can sign in with your new password">
        <p role="status" className="mb-4 text-sm text-body">For your safety you were signed out everywhere.</p>
        <Link to="/login" className="btn-primary w-full">Go to sign in</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Pick something you have not used elsewhere">
      <form onSubmit={handleSubmit((values) => reset.mutate({ token, newPassword: values.newPassword }))} className="space-y-4" noValidate>
        <Field label="New password" required type="password" autoComplete="new-password" autoFocus error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordStrength value={watch('newPassword') ?? ''} />
        <Field label="Confirm new password" required type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        {reset.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{reset.error.message}</p>}
        <Button type="submit" className="w-full" loading={reset.isPending}>{reset.isPending ? 'Saving…' : 'Save new password'}</Button>
      </form>
    </AuthCard>
  )
}
