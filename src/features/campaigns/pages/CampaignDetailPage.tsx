import { format, parseISO } from 'date-fns'
import { Copy, Pencil, Rocket, Trash2, XCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { AudienceCard } from '../components/AudienceCard'
import { CampaignPreview } from '../components/CampaignPreview'
import { CampaignStatsPanel } from '../components/CampaignStatsPanel'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import { RecipientsTable } from '../components/RecipientsTable'
import { ScheduleDialog } from '../components/ScheduleDialog'
import { TestSendDialog } from '../components/TestSendDialog'
import { campaignMessage } from '../errors'
import { useAudience, useCampaign, useCancelCampaign, useDeleteCampaign, useDuplicateCampaign, useLaunchCampaign } from '../hooks/useCampaigns'
import { audienceLabel, hasUnsubscribe, MAX_RECIPIENTS } from '../types'

const stamp = (iso: string) => format(parseISO(iso), 'd MMM yyyy, HH:mm')

export function CampaignDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: campaign, isPending, isError, error, refetch } = useCampaign(id)
  const canUpdate = useCan('campaigns.update')
  const canSend = useCan('campaigns.send')
  const canCreate = useCan('campaigns.create')
  const canDelete = useCan('campaigns.delete')
  const editable = campaign?.status === 'draft' || campaign?.status === 'scheduled'
  const audience = useAudience(id, Boolean(editable))
  const launch = useLaunchCampaign(id)
  const cancel = useCancelCampaign(id)
  const duplicate = useDuplicateCampaign()
  const remove = useDeleteCampaign()

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
  const { stats } = campaign
  const sending = campaign.status === 'sent' && stats.pending > 0

  const handleLaunch = async () => {
    // Count fresh: the audience can change between opening the page and pressing Send.
    const fresh = (await audience.refetch()).data
    if (!fresh) return void toast.error('We could not count who would receive it. Please try again.')
    if (!hasUnsubscribe(campaign.bodyHtml, campaign.bodyText)) return void toast.error(campaignMessage({ code: 'MISSING_UNSUBSCRIBE', message: '', errors: [] }))
    if (fresh.tooLarge) return void toast.error(`That is more than ${MAX_RECIPIENTS.toLocaleString()} people. Narrow the audience first.`)
    if (fresh.willReceive === 0) return void toast.error(campaignMessage({ code: 'NO_RECIPIENTS', message: '', errors: [] }))
    const n = fresh.willReceive
    const ok = await confirmDialog(`Send “${campaign.name}” now to ${n.toLocaleString()} ${n === 1 ? 'person' : 'people'}? Once the emails are on their way they cannot be called back.`, {
      title: 'Send this campaign?',
      confirmLabel: `Send to ${n.toLocaleString()} ${n === 1 ? 'person' : 'people'}`,
    })
    if (!ok) return
    launch.mutate(undefined, {
      onSuccess: () => toast.success('Sending has started', { description: 'Emails go out over the next few minutes. This page updates as they do.' }),
      onError: (e) => toast.error(campaignMessage(e)),
    })
  }

  const handleCancel = async () => {
    const scheduled = campaign.status === 'scheduled'
    const ok = await confirmDialog(
      scheduled
        ? 'Cancel the schedule? The campaign goes back to a draft and nothing is sent.'
        : `Stop sending? The ${stats.pending.toLocaleString()} emails still waiting will be held back. Emails already sent cannot be called back.`,
      { title: scheduled ? 'Cancel the schedule?' : 'Stop sending?', confirmLabel: scheduled ? 'Cancel schedule' : 'Stop sending' },
    )
    if (!ok) return
    cancel.mutate(undefined, {
      onSuccess: ({ held }) => toast.success(scheduled ? 'Schedule cancelled' : `Sending stopped. ${held.toLocaleString()} emails were held back.`),
      onError: (e) => toast.error(campaignMessage(e)),
    })
  }

  const handleDuplicate = () =>
    duplicate.mutate(campaign.id, {
      onSuccess: (copy) => {
        toast.success('Copy created', { description: 'It starts as a draft.' })
        navigate(`/campaigns/${copy.id}/edit`)
      },
      onError: (e) => toast.error(campaignMessage(e)),
    })

  const handleDelete = async () => {
    if (!(await confirmDialog(`Delete “${campaign.name}”? This cannot be undone.`, { title: 'Delete campaign?', confirmLabel: 'Delete campaign' }))) return
    remove.mutate(campaign.id, {
      onSuccess: () => {
        toast.success('Campaign deleted')
        navigate('/campaigns')
      },
      onError: (e) => toast.error(campaignMessage(e)),
    })
  }

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={`Subject: ${campaign.subject}`}
        actions={
          <>
            <CampaignStatusBadge status={campaign.status} stats={stats} />
            {editable && canUpdate && (
              <Link to={`/campaigns/${campaign.id}/edit`} className="btn-ghost gap-1.5">
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            )}
          </>
        }
      />

      {campaign.lastError && campaign.status === 'draft' && (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">The scheduled send could not run, so this went back to a draft: {campaign.lastError}</p>
      )}
      {campaign.status === 'scheduled' && campaign.scheduledAt && <p role="status" className="mb-4 rounded-xl bg-primary-soft px-3 py-2 text-sm text-heading">Scheduled to go out on {stamp(campaign.scheduledAt)}.</p>}
      {sending && <p role="status" className="mb-4 rounded-xl bg-primary-soft px-3 py-2 text-sm text-heading">Sending… {stats.pending.toLocaleString()} emails are still waiting to go out.</p>}
      {campaign.status === 'cancelled' && <p role="status" className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-heading">Sending was stopped. Emails that had already gone out were not recalled.</p>}

      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Campaign actions">
        {editable && canUpdate && <TestSendDialog campaignId={campaign.id} />}
        {editable && canSend && (
          <>
            <ScheduleDialog campaignId={campaign.id} people={audience.data?.willReceive} label={campaign.status === 'scheduled' ? 'Change schedule' : 'Schedule'} />
            <Button loading={launch.isPending} onClick={handleLaunch}>
              <Rocket className="size-4" aria-hidden /> {launch.isPending ? 'Starting…' : 'Send now'}
            </Button>
          </>
        )}
        {campaign.status === 'scheduled' && canSend && (
          <Button variant="ghost" loading={cancel.isPending} onClick={handleCancel}>
            <XCircle className="size-4" aria-hidden /> Cancel schedule
          </Button>
        )}
        {sending && canSend && (
          <Button variant="ghost" loading={cancel.isPending} onClick={handleCancel}>
            <XCircle className="size-4" aria-hidden /> Stop sending
          </Button>
        )}
        {canCreate && (
          <Button variant="ghost" loading={duplicate.isPending} onClick={handleDuplicate}>
            <Copy className="size-4" aria-hidden /> Duplicate
          </Button>
        )}
        {canDelete && (campaign.status === 'draft' || campaign.status === 'cancelled') && (
          <Button variant="ghost" className="text-destructive" loading={remove.isPending} onClick={handleDelete}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {stats.total > 0 && <CampaignStatsPanel stats={stats} />}
          {stats.total > 0 && <RecipientsTable campaignId={campaign.id} />}
          <section className="card p-5" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="mb-3 text-base font-semibold text-heading">The email</h2>
            <CampaignPreview subject={campaign.subject} bodyHtml={campaign.bodyHtml} bodyText={campaign.bodyText} />
          </section>
        </div>
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="mb-3 text-base font-semibold text-heading">Details</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Audience</dt><dd className="text-heading">{audienceLabel(campaign.audience)}</dd></div>
              {campaign.scheduledAt && campaign.status === 'scheduled' && <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Goes out</dt><dd className="text-heading">{stamp(campaign.scheduledAt)}</dd></div>}
              {campaign.launchedAt && <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Sent</dt><dd className="text-heading">{stamp(campaign.launchedAt)}</dd></div>}
              {campaign.skippedCount > 0 && <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Left out</dt><dd className="text-heading">{campaign.skippedCount.toLocaleString()} (no email address, or unsubscribed)</dd></div>}
              <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Created</dt><dd className="text-heading">{stamp(campaign.createdAt)}</dd></div>
            </dl>
          </section>
          {editable && <AudienceCard campaignId={campaign.id} />}
        </div>
      </div>
    </>
  )
}
