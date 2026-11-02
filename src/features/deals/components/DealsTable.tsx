import { format, parseISO } from 'date-fns'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ListTools } from '@/components/layout/ListTools'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatMoney } from '@/lib/money'
import { useUndoToast } from '@/lib/useBatch'
import { useListParams } from '@/lib/useListParams'
import { useDeals, useDeleteDeal } from '../hooks/useDeals'
import type { Deal, Stage } from '../types'

// The same deals as the board, as a sortable, searchable, exportable list.
export function DealsTable({ stages }: { stages: Stage[] }) {
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—'
  const columns: Column<Deal>[] = [
    { key: 'title', header: 'Deal', sortKey: 'title', primary: true, cell: (deal) => <span className="font-medium text-heading">{deal.title}</span> },
    { key: 'value', header: 'Value', sortKey: 'valueMinor', align: 'right', cell: (deal) => <span className="font-medium text-heading">{formatMoney(deal.valueMinor, deal.currency)}</span> },
    { key: 'stage', header: 'Stage', cell: (deal) => stageName(deal.stageId) },
    { key: 'close', header: 'Expected close', sortKey: 'expectedCloseDate', cell: (deal) => (deal.expectedCloseDate ? format(parseISO(deal.expectedCloseDate), 'd MMM yyyy') : '—') },
  ]

  const { params, searchParams, update } = useListParams(columns)
  const stageId = searchParams.get('stage') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useDeals({ ...params, stageId })
  const deleteDeal = useDeleteDeal()
  const undoToast = useUndoToast()
  const canUpdate = useCan('deals.update')
  const canDelete = useCan('deals.delete')
  const filtered = Boolean(params.search || stageId)
  const [, setSearchParams] = useSearchParams()

  const handleDelete = async (deal: Deal) => {
    if (!(await confirmDialog(`Delete deal "${deal.title}"? It moves to the trash and can be restored.`))) return
    deleteDeal.mutate(deal.id, { onSuccess: () => undoToast('deals', deal.id, 'Deal'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search deals" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by stage" value={stageId} onChange={(e) => update({ stage: e.target.value })} className="w-auto">
          <option value="">All stages</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <ListTools resource="deals" />
      </div>
      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          stageId && { label: `Stage: ${stageName(stageId)}`, onRemove: () => update({ stage: '' }) },
        ]}
        onClear={() => setSearchParams((p) => { const next = new URLSearchParams(p); ['search', 'stage', 'page'].forEach((k) => next.delete(k)); return next })}
      />
      <DataTable
        caption="Deals"
        columns={columns}
        columnsPref="deals"
        rows={data?.data}
        rowKey={(deal) => deal.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: filtered ? 'No deals match your filters.' : 'No deals yet.', hint: filtered ? 'Try a different search or clear the filters.' : 'Create a deal to see it here.' }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(deal) => (
          <>
            {canUpdate && <Link to={`/deals/${deal.id}/edit`} className="link-action">Edit</Link>}
            {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(deal)}>Delete</button>}
          </>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
