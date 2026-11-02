import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useCreatePortalTicket } from '../hooks/usePortal'

const schema = z.object({
  subject: z.string().trim().min(1, 'Please add a short subject').max(200),
  body: z.string().trim().min(1, 'Please describe what you need').max(10_000),
})

export function PortalNewTicketPage() {
  const navigate = useNavigate()
  const create = useCreatePortalTicket()
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: { subject: '', body: '' } })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(create.error, setError)

  return (
    <>
      <PageHeader title="New support request" subtitle="Tell us what you need and we will reply here." />
      <form
        noValidate
        className="card max-w-xl space-y-5 p-7"
        onSubmit={handleSubmit((values) => create.mutate(values, { onSuccess: (response) => { allowLeave(); navigate(`/portal/support/${response.data.data.id}`) } }))}
      >
        <Field label="Subject" required error={errors.subject?.message} {...register('subject')} />
        <div>
          <label htmlFor="portal-ticket-body" className="mb-1.5 block text-sm font-medium text-heading">How can we help? <span className="text-destructive" aria-hidden>*</span></label>
          <textarea id="portal-ticket-body" rows={6} required aria-required="true" aria-invalid={errors.body ? true : undefined} className="input-base h-auto py-2.5" {...register('body')} />
          {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>}
        </div>
        {create.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{create.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={create.isPending}>{create.isPending ? 'Sending…' : 'Send request'}</Button>
          <Link to="/portal/support" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
