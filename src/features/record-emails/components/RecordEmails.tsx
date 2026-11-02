import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { cn } from '@/lib/utils'
import { useRecordEmails, useSendRecordEmail } from '../hooks/useRecordEmails'
import { emailFormSchema, type EmailFormValues } from '../schemas/emailSchema'
import { emailPaths, MAX_EMAIL_BODY, type EmailEntity, type RecordEmail } from '../types'

type Props = {
  entity: EmailEntity
  entityId: string
  /** The address the email goes to; without one the compose box explains what is missing. */
  email: string | null | undefined
}

const deliveryTone = { queued: 'neutral', sending: 'info', sent: 'success', failed: 'danger' } as const

function Message({ mail }: { mail: RecordEmail }) {
  const inbound = mail.direction === 'inbound'
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight
  return (
    <li className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[85%] rounded-2xl border px-4 py-3 text-sm', inbound ? 'border-border bg-background' : 'border-primary/20 bg-primary-soft')}>
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <Icon className="size-3.5" aria-hidden />
          <span className="font-medium text-heading">{inbound ? (mail.emailAddress ?? 'Reply') : (mail.sentBy ?? 'You')}</span>
          <span>{inbound ? 'replied' : 'sent'}</span>
          <time dateTime={mail.occurredAt}>{format(parseISO(mail.occurredAt), 'd MMM yyyy, HH:mm')}</time>
          {!inbound && mail.deliveryStatus && <Badge tone={deliveryTone[mail.deliveryStatus]}>{mail.deliveryStatus}</Badge>}
        </div>
        <p className="font-medium text-heading">{mail.subject}</p>
        {mail.body && <p className="mt-1 whitespace-pre-wrap break-words text-body">{mail.body}</p>}
        {mail.deliveryStatus === 'failed' && mail.deliveryError && <p className="mt-1 text-xs text-destructive">Not delivered: {mail.deliveryError}</p>}
      </div>
    </li>
  )
}

function Composer({ entity, entityId, email }: Props) {
  const send = useSendRecordEmail(entity, entityId)
  // One key per message being written: a double-click or a retry sends it once. A new key starts after each success.
  const [key, setKey] = useState(() => crypto.randomUUID())
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { subject: '', body: '' },
  })
  const length = useWatch({ control, name: 'body' }).length

  const onSubmit = (values: EmailFormValues) =>
    send.mutate(
      { values, key },
      {
        onSuccess: () => {
          toast.success('Email queued')
          reset()
          setKey(crypto.randomUUID())
        },
      },
    )

  if (!email) {
    return <p className="rounded-xl bg-background px-3 py-2 text-sm text-muted">Add an email address to this {entity} to send them a message.</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 border-t border-border/60 pt-4">
      <p className="text-sm text-muted">
        To <span className="font-medium text-heading">{email}</span>. Their reply appears here and updates the {entity}.
      </p>
      <Field label="Subject" required error={errors.subject?.message} {...register('subject')} />
      <div className="space-y-1.5">
        <label htmlFor={`email-body-${entityId}`} className="block text-sm font-medium text-heading">
          Message <span className="text-destructive" aria-hidden>*</span>
        </label>
        <textarea
          id={`email-body-${entityId}`}
          rows={5}
          aria-required="true"
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? `email-body-error-${entityId}` : undefined}
          className="input-base h-auto py-2.5"
          {...register('body')}
        />
        {errors.body && <p id={`email-body-error-${entityId}`} role="alert" className="text-xs text-destructive">{errors.body.message}</p>}
        <p className={cn('text-xs', length > MAX_EMAIL_BODY ? 'text-destructive' : 'text-muted')}>{length.toLocaleString()} / {MAX_EMAIL_BODY.toLocaleString()}</p>
      </div>
      {send.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{send.error.message} Your message is still here, so you can try again.</p>}
      <Button type="submit" loading={send.isPending}>{send.isPending ? 'Sending…' : 'Send email'}</Button>
    </form>
  )
}

// The email conversation with one lead or contact, plus a box to write the next message.
export function RecordEmails({ entity, entityId, email }: Props) {
  const canView = useCan(`${emailPaths[entity]}.view`)
  const canSend = useCan(`${emailPaths[entity]}.update`)
  const emails = useRecordEmails(entity, entityId, canView)

  if (!canView) return null

  return (
    <section className="card mt-6 max-w-4xl p-6" aria-labelledby={`emails-${entityId}`}>
      <h2 id={`emails-${entityId}`} className="mb-4 flex items-center gap-2 text-base font-semibold text-heading">
        <Mail className="size-4" aria-hidden /> Email
      </h2>
      {emails.isPending ? (
        <TableSkeleton rows={2} />
      ) : emails.isError ? (
        <ErrorState message={emails.error.message} onRetry={() => void emails.refetch()} />
      ) : emails.data.length === 0 ? (
        <EmptyState title="No emails yet" hint={canSend ? 'Send the first message below.' : undefined} icon={Mail} />
      ) : (
        <ol className="mb-5 space-y-3">{emails.data.map((mail) => <Message key={mail.id} mail={mail} />)}</ol>
      )}
      {canSend && <Composer entity={entity} entityId={entityId} email={email} />}
    </section>
  )
}
