import { ErrorState } from '@/components/ui/Skeleton'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { format, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { useCan } from '@/features/auth/hooks/useCan'
import { OrderInvoice } from '@/features/invoices/components/OrderInvoice'
import { formatMoney } from '@/lib/money'
import { TotalsSummary } from '../components/TotalsSummary'
import { useChangeOrderStatus, useOrder } from '../hooks/useOrders'
import { nextActions, type OrderStatus } from '../types'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const { data: order, isPending, isError, error, refetch } = useOrder(id)
  const changeStatus = useChangeOrderStatus(id)
  const canUpdate = useCan('orders.update')

  if (isPending) return <p className="text-sm text-muted">Loading order…</p>
  if (isError) {
    return (
      <ErrorState message={error.message} onRetry={() => refetch()} />
    )
  }

  const handleAction = async (status: OrderStatus, label: string) => {
    let note: string | undefined
    if (status === 'cancelled') {
      const reason = await promptDialog(`Cancel order #${order.orderNumber}? Reserved stock goes back on the shelf.`, {
        title: 'Cancel order', confirmLabel: 'Cancel order', tone: 'danger', inputLabel: 'Reason (optional)',
      })
      if (reason === null) return
      note = reason || undefined
    } else if (!(await confirmDialog(`${label}?`, { title: label, confirmLabel: label, tone: 'primary' }))) {
      return
    }
    changeStatus.mutate({ status, note }, { onSuccess: () => toast.success(`Order is now ${status}`), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title={`Order #${order.orderNumber}`}
        subtitle={`Placed ${format(parseISO(order.createdAt), 'd MMM yyyy, HH:mm')}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge domain="order" status={order.status} />
            {canUpdate && nextActions[order.status].map((action) => (
              <button
                key={action.status}
                type="button"
                className={action.tone === 'danger' ? 'btn-ghost text-destructive' : 'btn-primary'}
                disabled={changeStatus.isPending}
                onClick={() => handleAction(action.status, action.label)}
              >
                {action.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid max-w-4xl gap-6">
        <section className="card p-6" aria-labelledby="order-items">
          <h2 id="order-items" className="mb-1 text-base font-semibold text-heading">Items</h2>
          <p className="mb-4 text-sm text-muted">
            Customer: <span className="text-heading">{order.customerName ?? 'Walk-in'}</span>
            {order.notes && <> · {order.notes}</>}
          </p>
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
                    <td className="py-2.5">
                      <div className="text-heading">{item.productName}</div>
                      {item.sku && <div className="text-xs text-muted">{item.sku}</div>}
                    </td>
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
            {order.taxRateBps > 0 && <p className="mt-1 text-right text-xs text-muted">Tax at {order.taxRateBps / 100}%</p>}
          </div>
        </section>

        <OrderInvoice orderId={order.id} orderStatus={order.status} />

        <section className="card p-6" aria-labelledby="order-history">
          <h2 id="order-history" className="mb-4 text-base font-semibold text-heading">Status history</h2>
          <ol className="space-y-3">
            {order.history.map((entry) => (
              <li key={entry.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge domain="order" status={entry.toStatus} />
                  <span className="text-xs text-muted">
                    {format(parseISO(entry.createdAt), 'd MMM yyyy, HH:mm')}
                    {entry.changedByName && ` · ${entry.changedByName}`}
                  </span>
                </div>
                {entry.note && <p className="mt-1 text-body">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
        <DocumentsPanel entityType="order" entityId={order.id} />
        <Link to="/orders" className="link-action w-fit">← Back to orders</Link>
      </div>
    </>
  )
}
