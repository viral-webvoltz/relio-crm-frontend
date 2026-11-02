import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { AuthCard } from '../components/AuthCard'
import { TwoFactorStep } from '../components/TwoFactorStep'
import { useLogin } from '../hooks/useAuth'
import { loginSchema, type LoginValues } from '../schemas/authSchemas'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  // Set when the account has two-step verification on: the first form stays mounted (hidden) so "Back" loses nothing.
  const [challenge, setChallenge] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginValues) =>
    login.mutate(values, {
      onSuccess: (result) => {
        if (result) {
          setNotice('')
          setChallenge(result.challengeToken)
        } else navigate('/', { replace: true })
      },
    })

  // The password fits accounts in several organizations: let the person pick one, then sign in again.
  const choices = login.error?.code === 'ORGANIZATION_REQUIRED' ? (login.error.errors as { slug: string; name: string }[]) : []
  const choose = (slug: string) => {
    setValue('organizationSlug', slug)
    void handleSubmit(onSubmit)()
  }

  return (
    <AuthCard
      title={challenge ? 'Two-step verification' : 'Sign in'}
      subtitle={challenge ? 'One more step to protect your account' : 'Sign in to your Relio workspace'}
    >
      {challenge && <TwoFactorStep challengeToken={challenge} onBack={() => setChallenge(null)} onExpired={(message) => { setChallenge(null); setNotice(message) }} />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate hidden={Boolean(challenge)}>
        {notice && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{notice}</p>}
        <Field label="Sign-in ID (only if you have several organizations)" hint="Shown under Settings → Organization. Leave empty if you only have one." autoComplete="organization" autoCapitalize="none" placeholder="e.g. acme" error={errors.organizationSlug?.message} {...register('organizationSlug')} />
        <Field label="Email" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Field label="Password" required type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        {choices.length > 0 && (
          <div className="space-y-2">
            {choices.map((c) => <Button key={c.slug} type="button" variant="ghost" className="w-full" onClick={() => choose(c.slug)}>{c.name}</Button>)}
          </div>
        )}
        {login.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{login.error.message}</p>}
        <Button type="submit" className="w-full" loading={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link></p>
      </form>
      {!challenge && (
        <p className="mt-4 text-center text-sm text-muted">
          New here? <Link to="/register" className="text-primary hover:underline">Create an organization</Link>
        </p>
      )}
    </AuthCard>
  )
}
