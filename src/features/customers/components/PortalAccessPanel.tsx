import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { useCan } from '@/features/auth/hooks/useCan'
import { useCreatePortalAccount, usePortalAccount, useUpdatePortalAccount } from '../hooks/usePortalAccess'

const createSchema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(8, 'At least 8 characters') })
const resetSchema = z.object({ password: z.string().min(8, 'At least 8 characters') })

// Staff-side control for a contact's customer-portal login. There is no email service yet, so the admin
// sets the initial password and passes it on; resetting it also signs the customer out everywhere.
export function PortalAccessPanel({ contactId, defaultEmail }: { contactId: string; defaultEmail: string }) {
  const canManage = useCan('portal.manage')
  const info = usePortalAccount(contactId, canManage)
  const create = useCreatePortalAccount(contactId)
  const update = useUpdatePortalAccount(contactId)

  const createForm = useForm({ resolver: zodResolver(createSchema), values: { email: defaultEmail, password: '' } })
  const resetForm = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '' } })

  if (!canManage) return null

  const loginLink = info.data ? `${window.location.origin}/portal/login?org=${info.data.organizationSlug}` : ''
  const account = info.data?.account

  return (
    <section className="card mt-6 max-w-xl p-6" aria-labelledby="portal-access">
      <h2 id="portal-access" className="mb-1 text-base font-semibold text-heading">Customer portal</h2>
      <p className="mb-4 text-sm text-muted">Lets this contact sign in to see only their own orders, invoices and payments.</p>

      {info.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : info.isError ? (
        <p role="alert" className="text-sm text-destructive">{info.error.message}</p>
      ) : account ? (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-heading">{account.email}</span>
            <Badge tone={account.isActive ? 'success' : 'neutral'}>{account.isActive ? 'active' : 'disabled'}</Badge>
            <span className="text-xs text-muted">{account.lastLoginAt ? `Last sign-in ${format(parseISO(account.lastLoginAt), 'd MMM yyyy, HH:mm')}` : 'Never signed in'}</span>
          </div>
          <p className="break-all rounded-xl bg-background/70 p-3 text-xs text-body">Sign-in link: {loginLink}</p>

          <form
            noValidate
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={resetForm.handleSubmit((values) =>
              update.mutate(values, { onSuccess: () => { toast.success('Password reset. The customer was signed out.'); resetForm.reset() }, onError: (e) => toast.error(e.message) }),
            )}
          >
            <Field label="Set a new password" type="password" autoComplete="new-password" error={resetForm.formState.errors.password?.message} {...resetForm.register('password')} />
            <Button type="submit" loading={update.isPending}>Reset password</Button>
          </form>

          <Button
            variant="ghost"
            loading={update.isPending}
            onClick={async () => {
              if (account.isActive && !(await confirmDialog('Disable portal access? The customer will be signed out and unable to sign in until you enable it again.', { title: 'Disable access?', confirmLabel: 'Disable access' }))) return
              update.mutate({ isActive: !account.isActive }, { onSuccess: () => toast.success(account.isActive ? 'Portal access disabled' : 'Portal access enabled'), onError: (e) => toast.error(e.message) })
            }}
          >
            {account.isActive ? 'Disable access' : 'Enable access'}
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={createForm.handleSubmit((values) =>
            create.mutate(values, { onSuccess: () => { toast.success('Portal access created'); createForm.reset() }, onError: (e) => toast.error(e.message) }),
          )}
        >
          <Field label="Login email" type="email" error={createForm.formState.errors.email?.message} {...createForm.register('email')} />
          <Field label="Initial password" type="password" autoComplete="new-password" error={createForm.formState.errors.password?.message} {...createForm.register('password')} />
          <Button type="submit" loading={create.isPending}>{create.isPending ? 'Creating…' : 'Give portal access'}</Button>
        </form>
      )}
    </section>
  )
}
