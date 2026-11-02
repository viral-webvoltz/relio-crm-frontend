import { format, parseISO } from 'date-fns'
import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatMoney } from '@/lib/money'
import { useListParams } from '@/lib/useListParams'
import type { PortalOrder } from '../types'
import { usePortalOrders } from '../hooks/usePortal'

const columns: Column<PortalOrder>[] = [
  { key: 'order', header: 'Order', primary: true, cell: (order) => <Link to={`/portal/orders/${order.id}`} className="font-medium text-primary hover:underline">#{order.orderNumber}</Link> },
  { key: 'date', header: 'Date', cell: (order) => format(parseISO(order.createdAt), 'd MMM yyyy') },
  { key: 'status', header: 'Status', cell: (order) => <StatusBadge domain="order" status={order.status} /> },
  { key: 'total', header: 'Total', align: 'right', cell: (order) => <span className="font-medium text-heading">{formatMoney(order.totalMinor, order.currency)}</span> },
]

export function PortalOrdersPage() {
  const { params, update } = useListParams()
  const { data, isPending, isFetching, isError, error, refetch } = usePortalOrders(params.page)

  return (
    <>
      <PageHeader title="My orders" subtitle="Everything you have ordered." />
      <DataTable
        caption="My orders"
        columns={columns}
        rows={data?.data}
        rowKey={(order) => order.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: ShoppingCart, title: 'No orders yet', hint: 'Your orders will appear here.' }}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
      />
    </>
  )
}
