import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { SecretDialog } from '../components/SecretDialog'
import { useSaveWebhook, useWebhooks } from '../hooks/useWebhooks'
import { emptyWebhook, splitEvents, toPayload, webhookFormSchema, type WebhookFormValues } from '../schemas/webhookSchema'
import { suggestedEvents } from '../types'

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'

export function WebhookFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useWebhooks()
  const save = useSaveWebhook(id)
  const hook = data?.find((h) => h.id === id)
  const [secret, setSecret] = useState<string | null>(null)

  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isDirty } } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: emptyWebhook,
    values: hook && { url: hook.url, allEvents: hook.events.includes('*'), events: hook.events.filter((e) => e !== '*').join(', ') },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (isPending) return <PageSkeleton />
  if (isError) return <p role="alert" className={alertClass}>{error.message}</p>
  if (id && !hook) return <p role="alert" className={alertClass}>Webhook not found</p>

  const allEvents = watch('allEvents')
  const chosen = new Set(splitEvents(watch('events')))
  const addEvent = (name: string) => setValue('events', [...splitEvents(watch('events')), name].join(', '), { shouldDirty: true, shouldValidate: true })

  const onSubmit = (values: WebhookFormValues) =>
    save.mutate(toPayload(values), {
      onSuccess: (created) => {
        allowLeave()
        if (created) return setSecret(created.secret) // the dialog shows the secret once, then continues to the list
        toast.success('Webhook updated')
        navigate('/settings/webhooks')
      },
    })

  const finish = () => {
    setSecret(null)
    toast.success('Webhook created')
    navigate('/settings/webhooks')
  }

  return (
    <>
      <PageHeader title={id ? 'Edit webhook' : 'New webhook'} subtitle={id ? undefined : 'We’ll show you a signing secret once after you save.'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-7">
        <FormSection title="Where to send events">
          <Field label="Endpoint address" required type="url" inputMode="url" autoComplete="off" placeholder="https://example.com/webhooks" hint="Must be a public https address." error={errors.url?.message} {...register('url')} />
        </FormSection>
        <FormSection title="Which events">
          <Checkbox label="All events" {...register('allEvents')} />
          {!allEvents && (
            <>
              <Field label="Events" required autoComplete="off" placeholder="leads.create, deals.stage" hint="Names look like leads.create. Separate several with commas." error={errors.events?.message} {...register('events')} />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Common events">
                {suggestedEvents.filter((name) => !chosen.has(name)).map((name) => (
                  <button key={name} type="button" onClick={() => addEvent(name)} className="min-h-8 rounded-full border border-border bg-surface px-3 text-xs font-medium text-body hover:border-primary hover:text-primary">
                    + {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </FormSection>
        {save.error && <p role="alert" className={alertClass}>{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending || save.isSuccess}>{save.isPending ? 'Saving…' : id ? 'Save changes' : 'Create webhook'}</Button>
          <Link to="/settings/webhooks" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      <SecretDialog secret={secret} onDone={finish} />
    </>
  )
}
