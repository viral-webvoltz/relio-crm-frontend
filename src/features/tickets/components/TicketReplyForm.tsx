import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAddTicketMessage } from '../hooks/useTickets'
import { messageFormSchema, type MessageFormValues } from '../schemas/ticketSchema'

export function TicketReplyForm({ ticketId, isClosed }: { ticketId: string; isClosed: boolean }) {
  const add = useAddTicketMessage(ticketId)
  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: { body: '', isInternal: false },
  })
  useServerFieldErrors(add.error, setError)
  const isInternal = watch('isInternal')
  // An unsent reply is work worth protecting; flipping "internal" alone is not.
  useUnsavedGuard(Boolean(watch('body')?.trim()))

  const onSubmit = (values: MessageFormValues) =>
    add.mutate(values, {
      onSuccess: () => {
        toast.success(values.isInternal ? 'Internal note added' : 'Reply sent')
        reset({ body: '', isInternal: values.isInternal })
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-3 border-t border-border/60 pt-5">
      <label htmlFor="ticket-reply" className="block text-sm font-medium text-heading">{isInternal ? 'Internal note' : 'Reply to customer'}</label>
      <textarea
        id="ticket-reply"
        rows={4}
        aria-invalid={errors.body ? true : undefined}
        className={isInternal ? 'input-base h-auto border-warning/50 bg-warning/10 py-2.5' : 'input-base h-auto py-2.5'}
        {...register('body')}
      />
      {errors.body && <p role="alert" className="text-xs text-destructive">{errors.body.message}</p>}
      <Checkbox label="Internal note (customers cannot see it)" {...register('isInternal')} />
      {!isInternal && <p className="text-xs text-muted">The customer also receives this reply by email.</p>}
      {isClosed && !isInternal && <p className="text-sm text-warning">This ticket is closed. Reopen it to reply to the customer, or tick Internal note.</p>}
      <Button type="submit" disabled={add.isPending || (isClosed && !isInternal)}>
        {add.isPending ? 'Sending…' : isInternal ? 'Add note' : 'Send reply'}
      </Button>
    </form>
  )
}
