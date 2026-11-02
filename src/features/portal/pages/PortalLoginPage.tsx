import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { usePortalLogin } from '../hooks/usePortal'
import { portalLoginSchema, type PortalLoginValues } from '../schemas/portalSchema'

export function PortalLoginPage() {
  const navigate = useNavigate()
  // The invitation link carries the company id (?org=...), so customers don't have to type it.
  const [searchParams] = useSearchParams()
  const login = usePortalLogin()
  // Remembered from the last sign-in on this device, so a returning customer only types email and password.
  const remembered = (() => { try { return localStorage.getItem('portal.org') ?? '' } catch { return '' } })()
  const fromLink = searchParams.get('org') ?? ''
  const { register, handleSubmit, formState: { errors } } = useForm<PortalLoginValues>({
    resolver: zodResolver(portalLoginSchema),
    defaultValues: { organizationSlug: fromLink || remembered, email: '', password: '' },
  })

  const onSubmit = (values: PortalLoginValues) =>
    login.mutate(values, {
      onSuccess: () => {
        try { localStorage.setItem('portal.org', values.organizationSlug) } catch { /* private mode: nothing to remember */ }
        navigate('/portal', { replace: true })
      },
    })

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Customer portal</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted">Sign in to see your orders, invoices and payments.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {fromLink || remembered ? (
            <input type="hidden" {...register('organizationSlug')} />
          ) : (
            <Field label="Company ID" hint="The short name of the company you buy from. It is in your invitation email." autoCapitalize="none" error={errors.organizationSlug?.message} {...register('organizationSlug')} />
          )}
          <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          {login.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{login.error.message}</p>}
          <Button type="submit" className="w-full" loading={login.isPending}>{login.isPending ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted">Forgot your password? Ask the company to reset it for you.</p>
      </div>
    </main>
  )
}
