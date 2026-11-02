import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { RotateCcw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchForm } from '@/components/ui/SearchForm'
import { useCan } from '@/features/auth/hooks/useCan'
import { restoreRecord, type RestorableResource } from '@/lib/batch'
import type { Paginated } from '@/lib/apiTypes'
import { httpClient, type ApiError } from '@/lib/httpClient'
import { useRefreshAll } from '@/lib/useBatch'
import { useListParams } from '@/lib/useListParams'
import { cn } from '@/lib/utils'

type Row = { id: string; deletedAt: string | null; firstName?: string; lastName?: string | null; name?: string; title?: string; email?: string | null; sku?: string | null; companyName?: string | null }

const kinds: { key: RestorableResource; label: string; noun: string; title: (r: Row) => string; detail: (r: Row) => string }[] = [
  { key: 'leads', label: 'Leads', noun: 'lead', title: (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || '(no name)', detail: (r) => r.email ?? r.companyName ?? '' },
  { key: 'contacts', label: 'Contacts', noun: 'contact', title: (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || '(no name)', detail: (r) => r.email ?? '' },
  { key: 'companies', label: 'Companies', noun: 'company', title: (r) => r.name ?? '', detail: () => '' },
  { key: 'deals', label: 'Deals', noun: 'deal', title: (r) => r.title ?? '', detail: () => '' },
  { key: 'tasks', label: 'Tasks', noun: 'task', title: (r) => r.title ?? '', detail: () => '' },
  { key: 'products', label: 'Products', noun: 'product', title: (r) => r.name ?? '', detail: (r) => r.sku ?? '' },
]

const columnsFor = (kind: (typeof kinds)[number], restoring: string | null, onRestore: (row: Row) => void): Column<Row>[] => [
  {
    key: 'name',
    header: kind.label.slice(0, -1) === 'Compan' ? 'Company' : kind.noun.replace(/^./, (c) => c.toUpperCase()),
    primary: true,
    cell: (row) => (
      <>
        <div className="font-medium text-heading">{kind.title(row)}</div>
        {kind.detail(row) && <div className="text-xs text-muted">{kind.detail(row)}</div>}
      </>
    ),
  },
  { key: 'deleted', header: 'Deleted', cell: (row) => (row.deletedAt ? format(parseISO(row.deletedAt), 'd MMM yyyy, HH:mm') : '—') },
  {
    key: 'restore',
    header: '',
    cell: (row) => (
      <button type="button" className="link-action gap-1" disabled={restoring === row.id} onClick={() => onRestore(row)}>
        <RotateCcw className="size-3.5" aria-hidden /> {restoring === row.id ? 'Restoring…' : 'Restore'}
      </button>
    ),
  },
]

// Deleted records are only hidden (soft delete). Restore brings one back with everything it had.
export function TrashPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const canLeads = useCan('leads.delete')
  const canContacts = useCan('contacts.delete')
  const canCompanies = useCan('companies.delete')
  const canDeals = useCan('deals.delete')
  const canTasks = useCan('tasks.delete')
  const canProducts = useCan('products.delete')
  const allowed: Record<RestorableResource, boolean> = { leads: canLeads, contacts: canContacts, companies: canCompanies, deals: canDeals, tasks: canTasks, products: canProducts }
  const available = kinds.filter((k) => allowed[k.key])
  const kind = available.find((k) => k.key === searchParams.get('type')) ?? available[0]

  const { params, update } = useListParams()
  const queryClient = useQueryClient()
  const refreshAll = useRefreshAll()

  const list = useQuery<Paginated<Row>, ApiError>({
    queryKey: ['trash', kind?.key, params],
    enabled: Boolean(kind),
    queryFn: async ({ signal }) => (await httpClient.get<Paginated<Row>>(`/${kind!.key}/trash`, { params: { page: params.page, limit: params.limit, search: params.search || undefined }, signal })).data,
    placeholderData: keepPreviousData,
  })

  const restore = useMutation<unknown, ApiError, Row>({
    mutationFn: (row) => restoreRecord(kind!.key, row.id),
    onSuccess: async (_d, row) => {
      toast.success(`${kind!.title(row)} restored`)
      await Promise.all([refreshAll(), queryClient.invalidateQueries({ queryKey: ['trash'] })])
    },
    // 409 RESTORE_CONFLICT: a unique value (contact email, product SKU) was reused after the delete.
    onError: (e) => toast.error(e.code === 'RESTORE_CONFLICT' ? `${e.message} Change the other record first, then restore this one.` : e.message),
  })

  if (!kind) {
    return (
      <>
        <PageHeader title="Trash" subtitle="Deleted records can be restored from here." />
        <p className="card p-8 text-sm text-muted">Your role can't restore deleted records.</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Trash" subtitle="Deleted records are kept here and can be restored." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Record type" className="flex flex-wrap gap-2">
          {available.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={k.key === kind.key}
              onClick={() => setSearchParams(k.key === available[0]?.key ? {} : { type: k.key })}
              className={cn('btn-ghost h-10', k.key === kind.key && 'border-primary bg-primary-soft text-primary')}
            >
              {k.label}
            </button>
          ))}
        </div>
        <SearchForm defaultValue={params.search} placeholder={`Search deleted ${kind.label.toLowerCase()}`} onSearch={(search) => update({ search })} />
      </div>
      <DataTable
        caption={`Deleted ${kind.label.toLowerCase()}`}
        columns={columnsFor(kind, restore.isPending ? (restore.variables?.id ?? null) : null, (row) => restore.mutate(row))}
        rows={list.data?.data}
        rowKey={(row) => row.id}
        loading={list.isPending && list.fetchStatus !== 'idle'}
        refreshing={list.isFetching}
        error={list.isError ? list.error : null}
        onRetry={() => list.refetch()}
        empty={{ title: params.search ? 'No deleted records match your search.' : `No deleted ${kind.label.toLowerCase()}.`, hint: 'Anything you delete shows up here until it is restored.' }}
        meta={list.data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
