import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatMoney } from '@/lib/money'
import { useCreateInvoice, useInvoices } from '../hooks/useInvoices'
import { formatInvoiceNumber } from '../types'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

// The invoice box on an order page: shows the live invoice, or offers to create one.
export function OrderInvoice({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const navigate = useNavigate()
  const canView = useCan('invoices.view')
  const canCreate = useCan('invoices.create')
  const invoices = useInvoices({ page: 1, search: '', status: '', orderId }, canView)
  const create = useCreateInvoice()

  if (!canView) return null
  const live = invoices.data?.data.find((invoice) => invoice.status !== 'void')

  const handleCreate = () =>
    create.mutate(orderId, {
      onSuccess: (response) => navigate(`/invoices/${response.data.data.id}`),
      onError: (e) => toast.error(e.message),
    })

  return (
    <section className="card p-6" aria-labelledby="order-invoice">
      <h2 id="order-invoice" className="mb-3 text-base font-semibold text-heading">Invoice</h2>
      {invoices.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : live ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Link to={`/invoices/${live.id}`} className="font-medium text-primary hover:underline">{formatInvoiceNumber(live.invoiceNumber)}</Link>
            <InvoiceStatusBadge invoice={live} />
          </div>
          <span className="text-muted">
            Paid {formatMoney(live.paidMinor, live.currency)} of {formatMoney(live.totalMinor, live.currency)}
          </span>
        </div>
      ) : orderStatus === 'cancelled' ? (
        <p className="text-sm text-muted">Cancelled orders are not invoiced.</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">No invoice yet.</p>
          {canCreate && <Button onClick={handleCreate} loading={create.isPending}>{create.isPending ? 'Creating…' : 'Create invoice'}</Button>}
        </div>
      )}
    </section>
  )
}
