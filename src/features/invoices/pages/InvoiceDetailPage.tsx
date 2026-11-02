import { ErrorState } from '@/components/ui/Skeleton'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatMoney } from '@/lib/money'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'
import { PaymentForm } from '../components/PaymentForm'
import { SendInvoiceButton } from '../components/SendInvoiceButton'
import { RefundForm } from '../components/RefundForm'
import { useInvoice, useVoidInvoice } from '../hooks/useInvoices'
import { formatInvoiceNumber, methodLabel } from '../types'

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(id)
  const voidInvoice = useVoidInvoice(id)
  const canVoid = useCan('invoices.void')
  const canSend = useCan('invoices.create')
  const canPay = useCan('payments.create')
  const canRefund = useCan('payments.refund')
  const [refundingId, setRefundingId] = useState<string | null>(null)

  if (isPending) return <p className="text-sm text-muted">Loading invoice…</p>
  if (isError) {
    return (
      <ErrorState message={error.message} onRetry={() => refetch()} />
    )
  }

  const money = (minor: number) => formatMoney(minor, invoice.currency)
  const isOpen = invoice.status === 'unpaid' || invoice.status === 'partial'

  const handleVoid = async () => {
    if (!(await confirmDialog(`Void ${formatInvoiceNumber(invoice.invoiceNumber)}? It can no longer take payments.`, { title: 'Void invoice', confirmLabel: 'Void invoice' }))) return
    voidInvoice.mutate(undefined, { onSuccess: () => toast.success('Invoice voided'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title={formatInvoiceNumber(invoice.invoiceNumber)}
        subtitle={`Issued ${format(parseISO(invoice.issueDate), 'd MMM yyyy')} · due ${format(parseISO(invoice.dueDate), 'd MMM yyyy')}`}
        actions={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge invoice={invoice} />
            {canSend && invoice.status !== 'void' && <SendInvoiceButton invoiceId={invoice.id} label={formatInvoiceNumber(invoice.invoiceNumber)} />}
            {canVoid && invoice.status !== 'void' && invoice.paidMinor === 0 && (
              <button type="button" className="btn-ghost text-destructive" onClick={handleVoid} disabled={voidInvoice.isPending}>Void invoice</button>
            )}
          </div>
        }
      />

      <div className="grid max-w-4xl gap-6">
        <section className="card p-6" aria-labelledby="invoice-summary">
          <h2 id="invoice-summary" className="mb-1 text-base font-semibold text-heading">Summary</h2>
          <p className="mb-4 text-sm text-muted">
            Customer: <span className="text-heading">{invoice.customerName ?? 'Walk-in'}</span> · For{' '}
            <Link to={`/orders/${invoice.orderId}`} className="text-primary hover:underline">order #{invoice.orderNumber}</Link>
          </p>
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
            <div className="flex justify-between py-1 text-base font-semibold text-heading"><dt>Outstanding</dt><dd>{money(invoice.outstandingMinor)}</dd></div>
          </dl>
          {invoice.notes && <p className="mt-3 text-sm text-body">{invoice.notes}</p>}
        </section>

        <section className="card p-6" aria-labelledby="invoice-payments">
          <h2 id="invoice-payments" className="mb-4 text-base font-semibold text-heading">Payments</h2>
          {canPay && isOpen && <PaymentForm invoiceId={invoice.id} outstandingMinor={invoice.outstandingMinor} />}
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-heading">{money(payment.amountMinor)}</span>{' '}
                      <span className="text-muted">via {methodLabel[payment.method]}{payment.reference && ` · ${payment.reference}`}</span>
                      <div className="text-xs text-muted">
                        {format(parseISO(payment.paidAt), 'd MMM yyyy, HH:mm')}
                        {payment.recordedBy && ` · ${payment.recordedBy}`}
                      </div>
                    </div>
                    {canRefund && payment.refundableMinor > 0 && invoice.status !== 'void' && refundingId !== payment.id && (
                      <button type="button" className="link-action" onClick={() => setRefundingId(payment.id)}>Refund…</button>
                    )}
                  </div>
                  {payment.refunds.map((refund) => (
                    <div key={refund.id} className="mt-1 pl-4 text-xs text-destructive">
                      Refunded {money(refund.amountMinor)} on {format(parseISO(refund.createdAt), 'd MMM yyyy')}
                      {refund.reason && ` — ${refund.reason}`}
                    </div>
                  ))}
                  {refundingId === payment.id && (
                    <RefundForm paymentId={payment.id} refundableMinor={payment.refundableMinor} onDone={() => setRefundingId(null)} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <DocumentsPanel entityType="invoice" entityId={invoice.id} />
        <Link to="/invoices" className="link-action w-fit">← Back to invoices</Link>
      </div>
    </>
  )
}
