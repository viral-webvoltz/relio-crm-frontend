import { Select } from '@/components/ui/Select'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type BulkAction, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { useCan } from '@/features/auth/hooks/useCan'
import { useBatch, useUndoToast } from '@/lib/useBatch'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useListParams } from '@/lib/useListParams'
import { useRowSelection } from '@/lib/useRowSelection'
import { useConvertLead, useDeleteLead, useLeads } from '../hooks/useLeads'
import { leadStatuses, type Lead } from '../types'

const fullName = (lead: Lead) => [lead.firstName, lead.lastName].filter(Boolean).join(' ')

const columns: Column<Lead>[] = [
  {
    key: 'name',
    header: 'Name',
    sortKey: 'name',
    primary: true,
    cell: (lead) => (
      <div className="flex items-center gap-3">
        <Avatar name={fullName(lead)} />
        <div className="min-w-0">
          <div className="font-medium text-heading">{fullName(lead)}</div>
          <div className="truncate text-xs text-muted">{lead.email ?? lead.companyName ?? ''}</div>
        </div>
      </div>
    ),
  },
  { key: 'source', header: 'Source', sortKey: 'source', cell: (lead) => <span className="capitalize">{lead.source}</span> },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (lead) => <StatusBadge domain="lead" status={lead.status} /> },
  { key: 'priority', header: 'Priority', sortKey: 'priority', cell: (lead) => <StatusBadge domain="priority" status={lead.priority} /> },
  { key: 'score', header: 'Score', sortKey: 'score', cell: (lead) => lead.score },
  { key: 'followUp', header: 'Follow-up', sortKey: 'followUpDate', cell: (lead) => lead.followUpDate ?? '—' },
]

export function LeadsPage() {
  const { params, searchParams, update } = useListParams(columns)
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useLeads({ ...params, status })
  const deleteLead = useDeleteLead()
  const convertLead = useConvertLead()
  const canCreate = useCan('leads.create')
  const canUpdate = useCan('leads.update')
  const canDelete = useCan('leads.delete')
  const canConvert = useCan('leads.convert')
  const canAssign = useCan('leads.assign')
  const { data: me } = useCurrentUser()
  const { selected, setSelected } = useRowSelection(data?.data, (lead) => lead.id)
  const fullNameOf = (id: string) => {
    const lead = data?.data.find((l) => l.id === id)
    return lead ? [lead.firstName, lead.lastName].filter(Boolean).join(' ') : id
  }
  const batch = useBatch('leads', ['lead', 'leads'], fullNameOf)
  const undoToast = useUndoToast()
  const bulkActions: BulkAction[] = [
    ...(canUpdate
      ? (['contacted', 'qualified', 'unqualified'] as const).map((status) => ({
          label: `Mark ${status}`,
          busy: batch.busy,
          run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { status } }),
        }))
      : []),
    ...(canAssign && me ? [{ label: 'Assign to me', busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { assignedTo: me.id } }, 'assigned to you') }] : []),
    ...(canDelete ? [{ label: 'Delete', danger: true, busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'delete' }) }] : []),
  ]
  const filtered = Boolean(params.search || status)

  const handleConvert = (lead: Lead) =>
    convertLead.mutate(lead.id, {
      onSuccess: () => toast.success(`${lead.firstName} converted to a contact`),
      onError: (e) => toast.error(e.message),
    })

  const handleDelete = async (lead: Lead) => {
    if (!(await confirmDialog(`Delete lead ${lead.firstName}? It moves to the trash and can be restored.`))) return
    deleteLead.mutate(lead.id, { onSuccess: () => undoToast('leads', lead.id, 'Lead'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Capture, qualify and convert incoming leads."
        actions={
          canCreate && (
            <Link to="/leads/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New lead
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search leads" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto capitalize">
          <option value="">All statuses</option>
          {[...leadStatuses, 'converted'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <ListTools resource="leads" importable="leads" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          status && { label: `Status: ${status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', status: '' })}
      />

      <DataTable
        caption="Leads"
        columns={columns}
        columnsPref="leads"
        rows={data?.data}
        rowKey={(lead) => lead.id}
        rowLabel={fullName}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No leads match your filters.' : 'No leads yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Use the button above to add your first one.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(lead) => (
          <>
            {canConvert && lead.status !== 'converted' && (
              <button type="button" className="link-action" disabled={convertLead.isPending} onClick={() => handleConvert(lead)}>
                Convert
              </button>
            )}
            {canUpdate && lead.status !== 'converted' && <Link to={`/leads/${lead.id}/edit`} className="link-action">Edit</Link>}
            {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(lead)}>Delete</button>}
          </>
        )}
        selection={
          bulkActions.length > 0 ? { selected, onChange: setSelected, noun: 'leads', bulkActions } : undefined
        }
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
