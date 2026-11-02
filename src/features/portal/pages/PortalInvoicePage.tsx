import { format, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { formatInvoiceNumber, methodLabel } from '@/features/invoices/types'
import { formatMoney } from '@/lib/money'
import { usePortalInvoice, usePortalMe } from '../hooks/usePortal'

export function PortalInvoicePage() {
  const { id = '' } = useParams()
  const { data: customer } = usePortalMe()
  const { data: invoice, isPending, isError, error, refetch } = usePortalInvoice(id)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const money = (minor: number) => formatMoney(minor, invoice.currency)

  return (
    <>
      <PageHeader
        title={formatInvoiceNumber(invoice.invoiceNumber)}
        subtitle={`Issued ${format(parseISO(invoice.issueDate), 'd MMM yyyy')} · due ${format(parseISO(invoice.dueDate), 'd MMM yyyy')}`}
        actions={<InvoiceStatusBadge invoice={invoice} />}
      />
      <div className="grid gap-6">
        <section className="card p-6" aria-labelledby="portal-invoice-items">
          <h2 id="portal-invoice-items" className="mb-1 text-base font-semibold text-heading">Items</h2>
          <p className="mb-4 text-sm text-muted">For order #{invoice.orderNumber}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Price</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-2.5 text-heading">{item.productName}</td>
                    <td className="py-2.5">{money(item.unitPriceMinor)}</td>
                    <td className="py-2.5">{item.quantity}</td>
                    <td className="py-2.5 text-right">{money(item.lineTotalMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto mt-4 w-full max-w-xs border-t border-border/60 pt-3 text-sm">
            <div className="flex justify-between py-1"><dt className="text-muted">Invoice total (after discount and tax)</dt><dd className="font-medium text-heading">{money(invoice.totalMinor)}</dd></div>
            <div className="flex justify-between py-1"><dt className="text-muted">Paid</dt><dd>{money(invoice.paidMinor)}</dd></div>
            <div className="flex justify-between py-1 text-base font-semibold text-heading"><dt>Balance due</dt><dd>{money(invoice.outstandingMinor)}</dd></div>
          </dl>
          {invoice.outstandingMinor > 0 && customer && (
            <p className="mt-4 text-sm text-muted">To pay this invoice, please contact {customer.organizationName}.</p>
          )}
        </section>

        <section className="card p-6" aria-labelledby="portal-payments">
          <h2 id="portal-payments" className="mb-4 text-base font-semibold text-heading">Payments</h2>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments received yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <span className="font-medium text-heading">{money(payment.amountMinor)}</span>{' '}
                    <span className="text-muted">via {methodLabel[payment.method]}</span>
                    {payment.refundedMinor > 0 && <span className="ml-2 text-destructive">({money(payment.refundedMinor)} refunded)</span>}
                  </span>
                  <span className="text-xs text-muted">{format(parseISO(payment.paidAt), 'd MMM yyyy')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Link to="/portal/invoices" className="link-action w-fit">← Back to my invoices</Link>
      </div>
    </>
  )
}
