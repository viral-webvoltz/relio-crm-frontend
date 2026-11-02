import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { AudienceCard } from '../components/AudienceCard'
import { AudienceFields } from '../components/AudienceFields'
import { CampaignPreview } from '../components/CampaignPreview'
import { campaignMessage } from '../errors'
import { useCampaign, useSaveCampaign } from '../hooks/useCampaigns'
import { campaignFormSchema, emptyCampaign, toFormValues, toPayload, type CampaignFormValues } from '../schemas/campaignSchema'
import { hasUnsubscribe, variables, type CampaignDetail } from '../types'

const textareaClass = 'input-base h-auto py-2.5 font-mono text-xs aria-invalid:border-destructive'
type TextField = 'subject' | 'bodyHtml' | 'bodyText'

function CampaignForm({ campaign }: { campaign?: CampaignDetail }) {
  const navigate = useNavigate()
  const save = useSaveCampaign(campaign?.id)
  const form = useForm<CampaignFormValues>({ resolver: zodResolver(campaignFormSchema), defaultValues: campaign ? toFormValues(campaign) : emptyCampaign })
  const { register, handleSubmit, setError, setValue, getValues, watch, formState: { errors, isDirty } } = form
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  const [subject, bodyHtml, bodyText] = watch(['subject', 'bodyHtml', 'bodyText'])

  // Puts a placeholder where the cursor is in whichever of the three text boxes was last used (the buttons never steal focus).
  const insert = (token: string) => {
    const el = document.activeElement
    const field = el instanceof HTMLElement ? (el.dataset.field as TextField | undefined) : undefined
    const target: TextField = field ?? 'bodyHtml'
    const input = field && (el as HTMLInputElement | HTMLTextAreaElement)
    const current = getValues(target)
    const start = input ? (input.selectionStart ?? current.length) : current.length
    const end = input ? (input.selectionEnd ?? start) : start
    setValue(target, current.slice(0, start) + token + current.slice(end), { shouldDirty: true, shouldValidate: true })
    if (input) setTimeout(() => { input.focus(); input.setSelectionRange(start + token.length, start + token.length) })
  }

  const onSubmit = (values: CampaignFormValues) =>
    save.mutate(toPayload(values), {
      onSuccess: (saved) => {
        allowLeave()
        toast.success(campaign ? 'Campaign saved' : 'Draft saved', campaign ? undefined : { description: 'Nothing has been sent. Review it, send yourself a test, then schedule or send it.' })
        navigate(`/campaigns/${saved.id}`)
      },
    })

  return (
    <>
      <PageHeader title={campaign ? 'Edit campaign' : 'New campaign'} subtitle="Write the email, choose who gets it. Nothing is sent until you press Send or Schedule on the next page." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-8 p-7">
          <FormSection title="The basics">
            <Field label="Campaign name" required autoComplete="off" hint="Only your team sees this, e.g. “March newsletter”." error={errors.name?.message} {...register('name')} />
            <Field label="Subject line" required autoComplete="off" data-field="subject" hint="What people see in their inbox." error={errors.subject?.message} {...register('subject')} />
          </FormSection>

          <FormSection title="The email">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Insert a detail">
              <span className="text-xs text-muted">Insert a detail:</span>
              {variables.map((v) => (
                <button key={v.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`{{${v.key}}}`)} className="min-h-8 rounded-full border border-border bg-surface px-3 text-xs font-medium text-body hover:border-primary hover:text-primary">
                  {v.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-html" className="text-sm font-medium text-heading">Email message (HTML) <span aria-hidden className="text-destructive">*</span></label>
              <textarea id="campaign-html" rows={10} required aria-required="true" spellCheck={false} data-field="bodyHtml" aria-invalid={errors.bodyHtml ? true : undefined} aria-describedby="campaign-html-hint" className={textareaClass} {...register('bodyHtml')} />
              <p id="campaign-html-hint" className="text-xs text-muted">You can use simple HTML. Links you add are tracked, so you can see who clicked.</p>
              {errors.bodyHtml && <p role="alert" className="text-xs text-destructive">{errors.bodyHtml.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-text" className="text-sm font-medium text-heading">Plain-text version <span aria-hidden className="text-destructive">*</span></label>
              <textarea id="campaign-text" rows={6} required aria-required="true" spellCheck={false} data-field="bodyText" aria-invalid={errors.bodyText ? true : undefined} aria-describedby="campaign-text-hint" className={textareaClass} {...register('bodyText')} />
              <p id="campaign-text-hint" className="text-xs text-muted">Shown by email apps that cannot display HTML.</p>
              {errors.bodyText && <p role="alert" className="text-xs text-destructive">{errors.bodyText.message}</p>}
            </div>
            {!hasUnsubscribe(bodyHtml, bodyText) && (
              <p role="status" className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-heading">
                Before you can send or schedule it, both versions need the unsubscribe link. Use the “Unsubscribe link” button above in each one.
              </p>
            )}
          </FormSection>

          <FormSection title="Who gets it">
            <AudienceFields form={form} />
          </FormSection>

          {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{campaignMessage(save.error)}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : campaign ? 'Save changes' : 'Save draft'}</Button>
            <Link to={campaign ? `/campaigns/${campaign.id}` : '/campaigns'} className="btn-ghost">Cancel</Link>
          </div>
        </form>

        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="card p-5" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="mb-3 text-base font-semibold text-heading">Preview</h2>
            <CampaignPreview subject={subject} bodyHtml={bodyHtml} bodyText={bodyText} />
          </section>
          {campaign ? <AudienceCard campaignId={campaign.id} note="Counted from the saved audience. Save your changes, then recount." /> : <p className="card p-5 text-sm text-muted">Save the draft to see how many people will receive it.</p>}
        </div>
      </div>
    </>
  )
}

export function CampaignFormPage() {
  const { id } = useParams()
  const { data, isPending, isError, error, refetch } = useCampaign(id ?? '')
  if (!id) return <CampaignForm />
  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
  if (data.status !== 'draft' && data.status !== 'scheduled') {
    return (
      <div className="card space-y-3 p-7">
        <h1 className="text-lg font-semibold text-heading">This campaign can no longer be edited</h1>
        <p className="text-sm text-body">Only drafts and scheduled campaigns can be changed. To send something similar, make a copy of it and edit the copy.</p>
        <Link to={`/campaigns/${data.id}`} className="btn-primary">Back to the campaign</Link>
      </div>
    )
  }
  return <CampaignForm key={data.id} campaign={data} />
}
