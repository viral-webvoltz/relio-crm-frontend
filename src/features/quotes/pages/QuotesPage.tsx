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
import { formatMoney } from '@/lib/money'
import { useListParams } from '@/lib/useListParams'
import { QuoteStatusBadge } from '../components/QuoteStatusBadge'
import { quoteErrorText } from '../errors'
import { useDeleteQuote, useQuotes } from '../hooks/useQuotes'
import { canDelete, canEdit, quoteStatuses, quoteStatusLabel, type Quote, type QuoteStatus } from '../types'

const columns: Column<Quote>[] = [
  { key: 'quote', header: 'Quote', sortKey: 'quoteNumber', primary: true, cell: (q) => <Link to={`/quotes/${q.id}`} className="font-medium text-primary hover:underline">#{q.quoteNumber}</Link> },
  { key: 'customer', header: 'Customer', sortKey: 'customer', cell: (q) => q.customerName ?? <span className="text-muted">No customer</span> },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (q) => <QuoteStatusBadge status={q.status} /> },
  { key: 'total', header: 'Total', sortKey: 'total', align: 'right', cell: (q) => <span className="font-medium text-heading">{formatMoney(q.totalMinor, q.currency)}</span> },
  { key: 'valid', header: 'Valid until', sortKey: 'validUntil', cell: (q) => (q.validUntil ? format(parseISO(q.validUntil), 'd MMM yyyy') : <span className="text-muted">—</span>) },
  { key: 'created', header: 'Created', sortKey: 'createdAt', cell: (q) => format(parseISO(q.createdAt), 'd MMM yyyy') },
]

export function QuotesPage() {
  const { params, searchParams, update } = useListParams(columns)
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useQuotes({ ...params, status })
  const deleteQuote = useDeleteQuote()
  const canCreate = useCan('quotes.create')
  const canUpdate = useCan('quotes.update')
  const canRemove = useCan('quotes.delete')
  const filtered = Boolean(params.search || status)

  const handleDelete = async (quote: Quote) => {
    if (!(await confirmDialog(`Delete quote #${quote.quoteNumber}? This cannot be undone.`, { title: 'Delete quote?', confirmLabel: 'Delete quote' }))) return
    deleteQuote.mutate(quote.id, { onSuccess: () => toast.success(`Quote #${quote.quoteNumber} deleted`), onError: (e) => toast.error(quoteErrorText(e)) })
  }

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle="Send a price offer to a customer. When they accept, turn it into an order."
        actions={
          canCreate && (
            <Link to="/quotes/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New quote
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search quote # or customer" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto capitalize">
          <option value="">All statuses</option>
          {quoteStatuses.map((s) => <option key={s} value={s}>{quoteStatusLabel[s]}</option>)}
        </Select>
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          status && { label: `Status: ${quoteStatusLabel[status as QuoteStatus] ?? status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', status: '' })}
      />

      <DataTable
        caption="Quotes"
        columns={columns}
        rows={data?.data}
        rowKey={(q) => q.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No quotes match your filters.' : 'No quotes yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Create a quote to offer a price to a customer.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(q) => (
          <>
            {canUpdate && canEdit(q.status) && <Link to={`/quotes/${q.id}/edit`} className="link-action">Edit</Link>}
            {canRemove && canDelete(q.status) && <button type="button" className="link-danger" onClick={() => handleDelete(q)}>Delete</button>}
          </>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
