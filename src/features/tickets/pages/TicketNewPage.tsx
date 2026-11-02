import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { ContactSelect, UserSelect } from '@/components/entity/EntitySelects'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useCreateTicket } from '../hooks/useTickets'
import { createTicketFormSchema, type CreateTicketFormValues } from '../schemas/ticketSchema'
import { ticketPriorities } from '../types'

export function TicketNewPage() {
  const navigate = useNavigate()
  const create = useCreateTicket()
  const { register, handleSubmit, control, setError, formState: { errors, isDirty } } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: { subject: '', body: '', priority: 'medium', contactId: '', assignedTo: '' },
  })

  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(create.error, setError)

  const onSubmit = (values: CreateTicketFormValues) =>
    create.mutate(values, {
      onSuccess: (response) => {
        allowLeave()
        toast.success(`Ticket #${response.data.data.ticketNumber} created`)
        navigate(`/support/${response.data.data.id}`)
      },
    })

  return (
    <>
      <PageHeader title="New ticket" subtitle="Log a customer issue on their behalf." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card max-w-xl space-y-5 p-7">
        <Field label="Subject" required error={errors.subject?.message} {...register('subject')} />
        <div>
          <label htmlFor="ticket-body" className="mb-1.5 block text-sm font-medium text-heading">Details <span className="text-destructive" aria-hidden>*</span></label>
          <textarea id="ticket-body" rows={5} required aria-required="true" aria-invalid={errors.body ? true : undefined} className="input-base h-auto py-2.5" {...register('body')} />
          {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactSelect control={control} name="contactId" label="Customer" emptyLabel="No customer" />
          <SelectField label="Priority" {...register('priority')}>
            {ticketPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </SelectField>
        </div>
        <UserSelect control={control} name="assignedTo" label="Assign to" />
        {create.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{create.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={create.isPending}>{create.isPending ? 'Creating…' : 'Create ticket'}</Button>
          <Link to="/support" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
