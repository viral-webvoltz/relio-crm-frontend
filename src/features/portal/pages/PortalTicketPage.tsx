import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { statusTone } from '@/features/tickets/types'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { cn } from '@/lib/utils'
import { usePortalReply, usePortalTicket } from '../hooks/usePortal'
import { portalStatusLabel } from '../tickets'

const schema = z.object({ body: z.string().trim().min(1, 'Write a message').max(10_000) })

export function PortalTicketPage() {
  const { id = '' } = useParams()
  const { data: ticket, isPending, isError, error, refetch } = usePortalTicket(id)
  const reply = usePortalReply(id)
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: { body: '' } })
  useUnsavedGuard(isDirty)
  useServerFieldErrors(reply.error, setError)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const isClosed = ticket.status === 'closed'

  return (
    <>
      <PageHeader
        title={`#${ticket.ticketNumber} ${ticket.subject}`}
        subtitle={`Opened ${format(parseISO(ticket.createdAt), 'd MMM yyyy, HH:mm')}`}
        actions={<Badge tone={statusTone[ticket.status]}>{portalStatusLabel[ticket.status]}</Badge>}
      />
      <section className="card p-6" aria-labelledby="portal-ticket-thread">
        <h2 id="portal-ticket-thread" className="mb-4 text-base font-semibold text-heading">Conversation</h2>
        <ol className="space-y-3">
          {ticket.messages.map((message) => (
            <li key={message.id} className={cn('rounded-xl border p-4 text-sm', message.authorType === 'customer' ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft/60')}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-heading">{message.authorType === 'customer' ? 'You' : 'Support team'}</span>
                <span>· {format(parseISO(message.createdAt), 'd MMM yyyy, HH:mm')}</span>
              </div>
              <p className="whitespace-pre-wrap text-body">{message.body}</p>
            </li>
          ))}
        </ol>

        {isClosed ? (
          <p className="mt-5 border-t border-border/60 pt-5 text-sm text-muted">
            This request is closed. If you still need help, <Link to="/portal/support/new" className="text-primary hover:underline">start a new request</Link>.
          </p>
        ) : (
          <form
            noValidate
            className="mt-5 space-y-3 border-t border-border/60 pt-5"
            onSubmit={handleSubmit((values) =>
              reply.mutate(values.body, { onSuccess: () => { toast.success('Reply sent'); reset() }, onError: (e) => toast.error(e.message) }),
            )}
          >
            <label htmlFor="portal-reply" className="block text-sm font-medium text-heading">Add a reply</label>
            <textarea id="portal-reply" rows={4} aria-invalid={errors.body ? true : undefined} className="input-base h-auto py-2.5" {...register('body')} />
            {errors.body && <p role="alert" className="text-xs text-destructive">{errors.body.message}</p>}
            <Button type="submit" loading={reply.isPending}>{reply.isPending ? 'Sending…' : 'Send reply'}</Button>
          </form>
        )}
      </section>
      <Link to="/portal/support" className="link-action mt-6 inline-block">← Back to support</Link>
    </>
  )
}
