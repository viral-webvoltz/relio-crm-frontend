import { Select } from '@/components/ui/Select'
import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatMoney } from '@/lib/money'
import { useListParams } from '@/lib/useListParams'
import { useOrders } from '../hooks/useOrders'
import { orderStatuses, type Order } from '../types'

const columns: Column<Order>[] = [
  {
    key: 'order',
    header: 'Order',
    sortKey: 'orderNumber',
    primary: true,
    cell: (order) => <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">#{order.orderNumber}</Link>,
  },
  { key: 'customer', header: 'Customer', sortKey: 'customer', cell: (order) => order.customerName ?? <span className="text-muted">Walk-in</span> },
  { key: 'date', header: 'Date', sortKey: 'createdAt', cell: (order) => format(parseISO(order.createdAt), 'd MMM yyyy') },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (order) => <StatusBadge domain="order" status={order.status} /> },
  { key: 'total', header: 'Total', sortKey: 'total', align: 'right', cell: (order) => <span className="font-medium text-heading">{formatMoney(order.totalMinor, order.currency)}</span> },
]

export function OrdersPage() {
  const { params, searchParams, update } = useListParams(columns)
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useOrders({ ...params, status })
  const canCreate = useCan('orders.create')
  const filtered = Boolean(params.search || status)

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Sales orders, with stock handled automatically."
        actions={
          canCreate && (
            <Link to="/orders/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New order
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search order # or customer" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto capitalize">
          <option value="">All statuses</option>
          {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <ListTools resource="orders" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          status && { label: `Status: ${status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', status: '' })}
      />

      <DataTable
        caption="Orders"
        columns={columns}
        columnsPref="orders"
        rows={data?.data}
        rowKey={(order) => order.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No orders match your filters.' : 'No orders yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Create an order to see it here.',
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
