import { format, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { formatMoney } from '@/lib/money'
import { usePortalOrder } from '../hooks/usePortal'

export function PortalOrderPage() {
  const { id = '' } = useParams()
  const { data: order, isPending, isError, error, refetch } = usePortalOrder(id)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  return (
    <>
      <PageHeader
        title={`Order #${order.orderNumber}`}
        subtitle={`Placed ${format(parseISO(order.createdAt), 'd MMM yyyy')}`}
        actions={<StatusBadge domain="order" status={order.status} />}
      />
      <div className="grid gap-6">
        <section className="card p-6" aria-labelledby="portal-order-items">
          <h2 id="portal-order-items" className="mb-4 text-base font-semibold text-heading">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">Price</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-2.5 text-heading">{item.productName}</td>
                    <td className="py-2.5">{formatMoney(item.unitPriceMinor, order.currency)}</td>
                    <td className="py-2.5">{item.quantity}</td>
                    <td className="py-2.5 text-right">{formatMoney(item.lineTotalMinor, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <TotalsSummary {...order} />
          </div>
        </section>

        <section className="card p-6" aria-labelledby="portal-order-history">
          <h2 id="portal-order-history" className="mb-4 text-base font-semibold text-heading">Progress</h2>
          <ol className="space-y-3">
            {order.history.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 text-sm">
                <StatusBadge domain="order" status={entry.toStatus} />
                <span className="text-xs text-muted">{format(parseISO(entry.createdAt), 'd MMM yyyy, HH:mm')}</span>
              </li>
            ))}
          </ol>
        </section>
        <Link to="/portal/orders" className="link-action w-fit">← Back to my orders</Link>
      </div>
    </>
  )
}
