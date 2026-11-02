import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { HowToConnect } from '../components/HowToConnect'
import { useMailSettings, useSaveMailAccount } from '../hooks/useMailSettings'

const schema = z.object({
  fromEmail: z.string().trim().email('Enter the Gmail address that will send'),
  fromName: z.string().trim().max(100, 'At most 100 characters'),
  clientId: z.string().trim().min(1, 'Client ID is required'),
  clientSecret: z.string().trim(),
  refreshToken: z.string().trim(),
})
type Values = z.infer<typeof schema>

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'

export function MailAccountFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useMailSettings()
  const save = useSaveMailAccount(id)
  const account = data?.accounts.find((a) => a.id === id)

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fromEmail: '', fromName: '', clientId: '', clientSecret: '', refreshToken: '' },
    values: account && { fromEmail: account.fromEmail, fromName: account.fromName ?? '', clientId: account.clientId, clientSecret: '', refreshToken: '' },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (isPending) return <PageSkeleton />
  if (isError) return <p role="alert" className={alertClass}>{error.message}</p>
  if (id && !account) return <p role="alert" className={alertClass}>Email account not found</p>

  const onSubmit = (values: Values) => {
    // The saved secrets are never sent to the browser, so on edit a blank box means "keep it". A new account needs both.
    if (!id && !values.clientSecret) return setError('clientSecret', { message: 'Client secret is required' })
    if (!id && !values.refreshToken) return setError('refreshToken', { message: 'Refresh token is required' })
    save.mutate(values, {
      onSuccess: () => {
        allowLeave()
        toast.success(id ? 'Email account saved' : 'Email account added')
        navigate('/settings/email')
      },
    })
  }

  return (
    <>
      <PageHeader title={id ? 'Edit email account' : 'Add email account'} subtitle={id ? undefined : 'The first account you add becomes the one emails are sent from.'} />
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Gmail address" required type="email" hint="The account emails are sent from." error={errors.fromEmail?.message} {...register('fromEmail')} />
            <Field label="Sender name" hint="Shown to the person receiving the email. Optional." error={errors.fromName?.message} {...register('fromName')} />
            <Field label="Client ID" required autoComplete="off" error={errors.clientId?.message} {...register('clientId')} />
            <Field
              label="Client secret"
              required={!id}
              type="password"
              autoComplete="new-password"
              hint={id ? 'Saved. Leave blank to keep it.' : undefined}
              error={errors.clientSecret?.message}
              {...register('clientSecret')}
            />
            <div className="md:col-span-2">
              <Field
                label="Refresh token"
                required={!id}
                type="password"
                autoComplete="new-password"
                hint={id ? 'Saved. Leave blank to keep it.' : undefined}
                error={errors.refreshToken?.message}
                {...register('refreshToken')}
              />
            </div>
          </div>
          {save.error && !Object.keys(errors).length && <p role="alert" className={alertClass}>{save.error.message}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            <Link to="/settings/email" className="btn-ghost">Cancel</Link>
          </div>
        </form>
        <HowToConnect />
      </div>
    </>
  )
}
