import { format, parseISO } from 'date-fns'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { formatMoney } from '@/lib/money'
import { ConvertQuoteButton } from '../components/ConvertQuoteButton'
import { QuoteStatusBadge } from '../components/QuoteStatusBadge'
import { SendQuoteButton } from '../components/SendQuoteButton'
import { quoteErrorText } from '../errors'
import { useDeleteQuote, useQuote } from '../hooks/useQuotes'
import { canDelete, canEdit, canSend } from '../types'

const when = (iso: string) => format(parseISO(iso), 'd MMM yyyy, HH:mm')

export function QuoteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: quote, isPending, isError, error, refetch } = useQuote(id)
  const deleteQuote = useDeleteQuote()
  const canUpdate = useCan('quotes.update')
  const canRemove = useCan('quotes.delete')
  const mayConvert = useCan('quotes.convert')
  const mayCreateOrders = useCan('orders.create')
  const canConvert = mayConvert && mayCreateOrders

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const handleDelete = async () => {
    if (!(await confirmDialog(`Delete quote #${quote.quoteNumber}? This cannot be undone.`, { title: 'Delete quote?', confirmLabel: 'Delete quote' }))) return
    deleteQuote.mutate(quote.id, {
      onSuccess: () => {
        toast.success(`Quote #${quote.quoteNumber} deleted`)
        navigate('/quotes', { replace: true })
      },
      onError: (e) => toast.error(quoteErrorText(e)),
    })
  }

  const converted = Boolean(quote.convertedOrderId)

  return (
    <>
      <PageHeader
        title={`Quote #${quote.quoteNumber}`}
        subtitle={`Created ${when(quote.createdAt)}${quote.customerName ? ` for ${quote.customerName}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            {canUpdate && canSend(quote.status) && <SendQuoteButton quoteId={quote.id} number={quote.quoteNumber} resend={quote.status === 'sent'} />}
            {canConvert && quote.status === 'accepted' && !converted && <ConvertQuoteButton quoteId={quote.id} number={quote.quoteNumber} />}
            {canUpdate && canEdit(quote.status) && <Link to={`/quotes/${quote.id}/edit`} className="btn-ghost">Edit</Link>}
            {canRemove && canDelete(quote.status) && <button type="button" className="btn-ghost text-destructive" disabled={deleteQuote.isPending} onClick={handleDelete}>Delete</button>}
          </div>
        }
      />

      {quote.status === 'expired' && <p role="status" className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-heading">This quote has expired, so the customer can no longer accept it. Edit the valid-until date and send it again.</p>}
      {converted && (
        <p role="status" className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-heading">
          Turned into{' '}
          <Link to={`/orders/${quote.convertedOrderId}`} className="font-medium text-primary hover:underline">{quote.orderNumber ? `order #${quote.orderNumber}` : 'an order'}</Link>
          {quote.convertedAt ? ` on ${when(quote.convertedAt)}` : ''}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="card p-6" aria-labelledby="quote-items">
          <h2 id="quote-items" className="mb-4 text-base font-semibold text-heading">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Items on this quote</caption>
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-heading">{item.productName}</div>
                      {item.sku && <div className="text-xs text-muted">SKU {item.sku}</div>}
                      {item.description && <div className="mt-0.5 text-xs text-body">{item.description}</div>}
                    </td>
                    <td className="px-3 py-3 text-right">{item.quantity}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(item.unitPriceMinor, quote.currency)}</td>
                    <td className="py-3 pl-3 text-right font-medium text-heading">{formatMoney(item.lineTotalMinor, quote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4"><TotalsSummary {...quote} /></div>
          {quote.taxRateBps > 0 && <p className="mt-1 text-right text-xs text-muted">Tax at {quote.taxRateBps / 100}%</p>}
          {quote.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-heading">Notes for the customer</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-body">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-heading">Terms</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-body">{quote.terms}</p>
            </div>
          )}
        </section>

        <aside className="card h-fit space-y-4 p-6 text-sm" aria-label="Quote details">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Valid until</p>
            <p className="mt-0.5 text-heading">{quote.validUntil ? format(parseISO(quote.validUntil), 'd MMM yyyy') : 'Set when you send it'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Sent</p>
            <p className="mt-0.5 text-heading">{quote.sentAt ? when(quote.sentAt) : 'Not sent yet'}</p>
          </div>
          {quote.respondedAt && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{quote.status === 'rejected' ? 'Declined' : 'Accepted'}</p>
              <p className="mt-0.5 text-heading">{when(quote.respondedAt)}{quote.respondedByName ? ` by ${quote.respondedByName}` : ''}</p>
              {quote.responseNote && <p className="mt-1 whitespace-pre-wrap text-body">“{quote.responseNote}”</p>}
            </div>
          )}
          {quote.contactId && <Link to={`/contacts/${quote.contactId}/edit`} className="link-action block">Open contact</Link>}
          {quote.dealId && <Link to={`/deals/${quote.dealId}/edit`} className="link-action block">Open deal</Link>}
        </aside>
      </div>
      <div className="mt-6">
        <DocumentsPanel entityType="quote" entityId={quote.id} />
      </div>
    </>
  )
}
