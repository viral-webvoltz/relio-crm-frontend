import { format, parseISO } from 'date-fns'
import { Ban, Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { useListParams } from '@/lib/useListParams'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import { campaignMessage } from '../errors'
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign } from '../hooks/useCampaigns'
import { audienceLabel, campaignStatuses, type Campaign, type CampaignStatus } from '../types'

const when = (c: Campaign) =>
  c.status === 'scheduled' && c.scheduledAt ? `Goes out ${format(parseISO(c.scheduledAt), 'd MMM yyyy, HH:mm')}` : c.launchedAt ? `Sent ${format(parseISO(c.launchedAt), 'd MMM yyyy, HH:mm')}` : '—'

const columns: Column<Campaign>[] = [
  {
    key: 'name',
    header: 'Campaign',
    sortKey: 'name',
    primary: true,
    cell: (c) => (
      <>
        <Link to={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
        <div className="max-w-md truncate text-xs text-muted">{c.subject}</div>
      </>
    ),
  },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (c) => <CampaignStatusBadge status={c.status} /> },
  { key: 'audience', header: 'Sent to', cell: (c) => audienceLabel(c.audience) },
  { key: 'when', header: 'When', sortKey: 'launchedAt', cell: (c) => <span className="text-muted">{when(c)}</span> },
  { key: 'created', header: 'Created', sortKey: 'createdAt', cell: (c) => <span className="text-muted">{format(parseISO(c.createdAt), 'd MMM yyyy')}</span> },
]

export function CampaignsPage() {
  const navigate = useNavigate()
  const { params, searchParams, update } = useListParams(columns)
  const [, setSearchParams] = useSearchParams()
  const status = (campaignStatuses as readonly string[]).includes(searchParams.get('status') ?? '') ? (searchParams.get('status') as CampaignStatus) : ''
  const { data, isPending, isFetching, isError, error, refetch } = useCampaigns({ ...params, status })
  const canCreate = useCan('campaigns.create')
  const canDelete = useCan('campaigns.delete')
  const canSuppress = useCan('campaigns.view')
  const duplicate = useDuplicateCampaign()
  const remove = useDeleteCampaign()
  const filtered = Boolean(params.search || status)

  const handleDuplicate = (c: Campaign) =>
    duplicate.mutate(c.id, {
      onSuccess: (copy) => {
        toast.success('Copy created', { description: 'It starts as a draft.' })
        navigate(`/campaigns/${copy.id}/edit`)
      },
      onError: (e) => toast.error(campaignMessage(e)),
    })

  const handleDelete = async (c: Campaign) => {
    if (!(await confirmDialog(`Delete “${c.name}”? This cannot be undone.`, { title: 'Delete campaign?', confirmLabel: 'Delete campaign' }))) return
    remove.mutate(c.id, { onSuccess: () => toast.success('Campaign deleted'), onError: (e) => toast.error(campaignMessage(e)) })
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Send one email to many people at once, and see who opened it."
        actions={
          <>
            {canSuppress && (
              <Link to="/campaigns/suppressions" className="btn-ghost gap-1.5">
                <Ban className="size-4" aria-hidden /> Do-not-email list
              </Link>
            )}
            {canCreate && (
              <Link to="/campaigns/new" className="btn-primary">
                <Plus className="size-4" aria-hidden /> New campaign
              </Link>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search campaigns" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="w-auto capitalize">
          <option value="">Any status</option>
          {campaignStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <FilterChips
        chips={[params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) }, status && { label: `Status: ${status}`, onRemove: () => update({ status: '' }) }]}
        onClear={() => setSearchParams((p) => { const next = new URLSearchParams(p); ['search', 'status', 'page'].forEach((k) => next.delete(k)); return next })}
      />
      <DataTable
        caption="Campaigns"
        columns={columns}
        rows={data?.data}
        rowKey={(c) => c.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: filtered ? 'No campaigns match your filters' : 'No campaigns yet', hint: filtered ? 'Try a different search or clear the filters.' : 'Create one to email a group of contacts at once.' }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(c) => (
          <>
            <Link to={`/campaigns/${c.id}`} className="link-action">Open</Link>
            {canCreate && <button type="button" className="link-action" disabled={duplicate.isPending} onClick={() => handleDuplicate(c)}>Duplicate</button>}
            {canDelete && (c.status === 'draft' || c.status === 'cancelled') && <button type="button" className="link-danger" onClick={() => handleDelete(c)}>Delete</button>}
          </>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
