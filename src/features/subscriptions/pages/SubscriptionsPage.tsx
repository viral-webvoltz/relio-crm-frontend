import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { useListParams } from '@/lib/useListParams'
import { SubscriptionStatusBadge } from '../components/SubscriptionStatusBadge'
import { subscriptionErrorText } from '../errors'
import { useChangeSubscription, useDeleteSubscription, useSubscriptions } from '../hooks/useSubscriptions'
import { canCancel, canDelete, canPause, canResume, everyText, pausedByFailures, statusLabel, subscriptionStatuses, type Subscription, type SubscriptionStatus } from '../types'

const day = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

const columns: Column<Subscription>[] = [
  {
    key: 'name',
    header: 'Subscription',
    sortKey: 'name',
    primary: true,
    cell: (s) => (
      <>
        <Link to={`/subscriptions/${s.id}`} className="font-medium text-primary hover:underline">{s.name}</Link>
        {pausedByFailures(s) && <div className="text-xs text-destructive">Paused after repeated billing problems</div>}
      </>
    ),
  },
  { key: 'customer', header: 'Customer', sortKey: 'customer', cell: (s) => s.customerName ?? <span className="text-muted">No customer</span> },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (s) => <SubscriptionStatusBadge status={s.status} /> },
  { key: 'every', header: 'Billed', cell: (s) => <span className="capitalize">{everyText(s.intervalUnit, s.intervalCount)}</span> },
  { key: 'next', header: 'Next invoice', sortKey: 'nextRunOn', cell: (s) => (s.nextRunOn ? day(s.nextRunOn) : <span className="text-muted">—</span>) },
  { key: 'runs', header: 'Invoices so far', align: 'right', cell: (s) => (s.maxRuns ? `${s.runCount} of ${s.maxRuns}` : s.runCount) },
]

export function SubscriptionsPage() {
  const { params, searchParams, update } = useListParams(columns)
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useSubscriptions({ ...params, status })
  const change = useChangeSubscription()
  const remove = useDeleteSubscription()
  const canCreate = useCan('subscriptions.create')
  const canUpdate = useCan('subscriptions.update')
  const canRemove = useCan('subscriptions.delete')
  const filtered = Boolean(params.search || status)

  const pause = (s: Subscription) =>
    change.mutate({ id: s.id, action: 'pause' }, { onSuccess: () => toast.success(`“${s.name}” paused. No invoices are created while it is paused.`), onError: (e) => toast.error(subscriptionErrorText(e)) })

  const resume = (s: Subscription) =>
    change.mutate(
      { id: s.id, action: 'resume' },
      { onSuccess: () => toast.success(`“${s.name}” resumed`, { description: 'Billing continues from the next billing date. The paused time is not billed.' }), onError: (e) => toast.error(subscriptionErrorText(e)) },
    )

  const cancel = async (s: Subscription) => {
    if (!(await confirmDialog(`Cancel “${s.name}”? No more invoices will be created. Invoices already created stay as they are. This can’t be undone.`, { title: 'Cancel subscription?', confirmLabel: 'Cancel subscription' }))) return
    change.mutate({ id: s.id, action: 'cancel' }, { onSuccess: () => toast.success(`“${s.name}” cancelled`), onError: (e) => toast.error(subscriptionErrorText(e)) })
  }

  const handleDelete = async (s: Subscription) => {
    if (!(await confirmDialog(`Delete “${s.name}”? It has not created any invoices yet. This can’t be undone.`, { title: 'Delete subscription?', confirmLabel: 'Delete subscription' }))) return
    remove.mutate(s.id, { onSuccess: () => toast.success(`“${s.name}” deleted`), onError: (e) => toast.error(subscriptionErrorText(e)) })
  }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Bill a customer automatically every week, month or year."
        actions={
          canCreate && (
            <Link to="/subscriptions/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New subscription
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search name or customer" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto capitalize">
          <option value="">All statuses</option>
          {subscriptionStatuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </Select>
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          status && { label: `Status: ${statusLabel[status as SubscriptionStatus] ?? status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', status: '' })}
      />

      <DataTable
        caption="Subscriptions"
        columns={columns}
        rows={data?.data}
        rowKey={(s) => s.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No subscriptions match your filters.' : 'No subscriptions yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Create one to invoice a customer on a schedule without lifting a finger.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(s) => (
          <>
            <Link to={`/subscriptions/${s.id}`} className="link-action">Open</Link>
            {canUpdate && canPause(s.status) && <button type="button" className="link-action" disabled={change.isPending} onClick={() => pause(s)}>Pause</button>}
            {canUpdate && canResume(s.status) && <button type="button" className="link-action" disabled={change.isPending} onClick={() => resume(s)}>Resume</button>}
            {canUpdate && canCancel(s.status) && <button type="button" className="link-danger" disabled={change.isPending} onClick={() => cancel(s)}>Cancel</button>}
            {canRemove && canDelete(s) && <button type="button" className="link-danger" disabled={remove.isPending} onClick={() => handleDelete(s)}>Delete</button>}
          </>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
