import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { AuthCard } from '../components/AuthCard'
import { useForgotPassword } from '../hooks/useAuth'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/authSchemas'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  return (
    <AuthCard title="Reset your password" subtitle="We will email you a link to choose a new one">
      {forgot.isSuccess ? (
        <div role="status" className="space-y-4">
          {/* Same wording whether or not the address has an account, so nobody can use this page to find out who is registered. */}
          <p className="rounded-xl bg-primary-soft px-3 py-3 text-sm text-heading">If an account exists for that email, a reset link has been sent. It can take a few minutes to arrive; check your spam folder too.</p>
          <Link to="/login" className="btn-ghost w-full">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit((values) => forgot.mutate(values.email))} className="space-y-4" noValidate>
          <Field label="Email" required type="email" autoComplete="email" autoFocus hint="The email you sign in with." error={errors.email?.message} {...register('email')} />
          {forgot.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{forgot.error.message}</p>}
          <Button type="submit" className="w-full" loading={forgot.isPending}>{forgot.isPending ? 'Sending…' : 'Send reset link'}</Button>
          <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </AuthCard>
  )
}
