import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { AuthCard } from '../components/AuthCard'
import { useRegister } from '../hooks/useAuth'
import { registerSchema, type RegisterValues } from '../schemas/authSchemas'

export function RegisterPage() {
  const navigate = useNavigate()
  const registerOrg = useRegister()
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = (values: RegisterValues) => registerOrg.mutate(values, { onSuccess: () => navigate('/', { replace: true }) })

  return (
    <AuthCard title="Create your organization" subtitle="You will be the owner">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Organization name" required autoComplete="organization" error={errors.organizationName?.message} {...register('organizationName')} />
        <Field label="Your name" required autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <Field label="Email" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Field label="Password" required type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        {registerOrg.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{registerOrg.error.message}</p>}
        <Button type="submit" className="w-full" loading={registerOrg.isPending}>
          {registerOrg.isPending ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}
