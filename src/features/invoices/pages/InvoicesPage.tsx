import { Select } from '@/components/ui/Select'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { formatMoney } from '@/lib/money'
import { useListParams } from '@/lib/useListParams'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'
import { useInvoices } from '../hooks/useInvoices'
import { formatInvoiceNumber, invoiceStatuses, type Invoice } from '../types'

const columns: Column<Invoice>[] = [
  {
    key: 'invoice',
    header: 'Invoice',
    sortKey: 'invoiceNumber',
    primary: true,
    cell: (invoice) => (
      <>
        <Link to={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">{formatInvoiceNumber(invoice.invoiceNumber)}</Link>
        <div className="text-xs text-muted">Order #{invoice.orderNumber}</div>
      </>
    ),
  },
  { key: 'customer', header: 'Customer', sortKey: 'customer', cell: (invoice) => invoice.customerName ?? <span className="text-muted">Walk-in</span> },
  { key: 'due', header: 'Due', sortKey: 'dueDate', cell: (invoice) => format(parseISO(invoice.dueDate), 'd MMM yyyy') },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (invoice) => <InvoiceStatusBadge invoice={invoice} /> },
  { key: 'total', header: 'Total', sortKey: 'total', align: 'right', cell: (invoice) => formatMoney(invoice.totalMinor, invoice.currency) },
  {
    key: 'outstanding',
    header: 'Outstanding',
    sortKey: 'balance',
    align: 'right',
    cell: (invoice) => (
      <span className="font-medium text-heading">
        {invoice.status === 'void' ? '—' : formatMoney(Math.max(0, invoice.totalMinor - invoice.paidMinor), invoice.currency)}
      </span>
    ),
  },
]

export function InvoicesPage() {
  const { params, searchParams, update } = useListParams(columns)
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useInvoices({ ...params, status })
  const filtered = Boolean(params.search || status)

  return (
    <>
      <PageHeader title="Invoices" subtitle="Bills for your orders and what has been paid." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search invoice # or customer" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto capitalize">
          <option value="">All statuses</option>
          <option value="overdue">Overdue</option>
          {invoiceStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <ListTools resource="invoices" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          status && { label: `Status: ${status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', status: '' })}
      />

      <DataTable
        caption="Invoices"
        columns={columns}
        columnsPref="invoices"
        rows={data?.data}
        rowKey={(invoice) => invoice.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No invoices match your filters.' : 'No invoices yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Open an order and choose Create invoice.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
