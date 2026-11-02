import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { formatMoney } from '@/lib/money'
import { RunNowButton } from '../components/RunNowButton'
import { RunsTable } from '../components/RunsTable'
import { SubscriptionStatusBadge } from '../components/SubscriptionStatusBadge'
import { subscriptionErrorText } from '../errors'
import { useChangeSubscription, useDeleteSubscription, useSubscription } from '../hooks/useSubscriptions'
import { canCancel, canDelete, canEdit, canPause, canResume, canRunNow, everyText, MAX_FAILURES, pausedByFailures, type RunNowResult } from '../types'

const day = (iso: string) => format(parseISO(iso), 'd MMM yyyy')
const when = (iso: string) => format(parseISO(iso), 'd MMM yyyy, HH:mm')

export function SubscriptionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: sub, isPending, isError, error, refetch } = useSubscription(id)
  const change = useChangeSubscription()
  const remove = useDeleteSubscription()
  const canUpdate = useCan('subscriptions.update')
  const canRemove = useCan('subscriptions.delete')
  // Billing creates an order and an invoice, so the server also asks for these rights.
  const canOrder = useCan('orders.create')
  const canInvoice = useCan('invoices.create')
  const mayBill = canOrder && canInvoice
  const [billed, setBilled] = useState<RunNowResult | null>(null)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const act = (action: 'pause' | 'resume', message: string, description?: string) =>
    change.mutate({ id: sub.id, action }, { onSuccess: () => toast.success(message, description ? { description } : undefined), onError: (e) => toast.error(subscriptionErrorText(e)) })

  const cancel = async () => {
    if (!(await confirmDialog(`Cancel “${sub.name}”? No more invoices will be created. Invoices already created stay as they are. This can’t be undone.`, { title: 'Cancel subscription?', confirmLabel: 'Cancel subscription' }))) return
    change.mutate({ id: sub.id, action: 'cancel' }, { onSuccess: () => toast.success(`“${sub.name}” cancelled`), onError: (e) => toast.error(subscriptionErrorText(e)) })
  }

  const handleDelete = async () => {
    if (!(await confirmDialog(`Delete “${sub.name}”? It has not created any invoices yet. This can’t be undone.`, { title: 'Delete subscription?', confirmLabel: 'Delete subscription' }))) return
    remove.mutate(sub.id, {
      onSuccess: () => {
        toast.success(`“${sub.name}” deleted`)
        navigate('/subscriptions', { replace: true })
      },
      onError: (e) => toast.error(subscriptionErrorText(e)),
    })
  }

  const ends = sub.endOn ? `On ${day(sub.endOn)}` : sub.maxRuns ? `After ${sub.maxRuns} invoice${sub.maxRuns === 1 ? '' : 's'}` : 'Never — until it is cancelled'
  const invoiceNumber = billed?.invoice.invoiceNumber

  return (
    <>
      <PageHeader
        title={sub.name}
        subtitle={`Created ${when(sub.createdAt)}${sub.customerName ? ` for ${sub.customerName}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SubscriptionStatusBadge status={sub.status} />
            {canUpdate && mayBill && canRunNow(sub.status) && <RunNowButton id={sub.id} name={sub.name} nextRunOn={sub.nextRunOn} onDone={setBilled} />}
            {canUpdate && canPause(sub.status) && <button type="button" className="btn-ghost" disabled={change.isPending} onClick={() => act('pause', `“${sub.name}” paused`, 'No invoices are created while it is paused.')}>Pause</button>}
            {canUpdate && canResume(sub.status) && (
              <button type="button" className="btn-ghost" disabled={change.isPending} onClick={() => act('resume', `“${sub.name}” resumed`, 'Billing continues from the next billing date. The paused time is not billed.')}>
                Resume
              </button>
            )}
            {canUpdate && canEdit(sub.status) && <Link to={`/subscriptions/${sub.id}/edit`} className="btn-ghost">Edit</Link>}
            {canUpdate && canCancel(sub.status) && <button type="button" className="btn-ghost text-destructive" disabled={change.isPending} onClick={cancel}>Cancel subscription</button>}
            {canRemove && canDelete(sub) && <button type="button" className="btn-ghost text-destructive" disabled={remove.isPending} onClick={handleDelete}>Delete</button>}
          </div>
        }
      />

      {billed && (
        <p role="status" className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-heading">
          Invoice created.{' '}
          <Link to={`/invoices/${billed.invoice.id}`} className="font-medium text-primary hover:underline">{invoiceNumber ? `Open invoice #${invoiceNumber}` : 'Open the invoice'}</Link>
          {billed.order.id && <> · <Link to={`/orders/${billed.order.id}`} className="font-medium text-primary hover:underline">Open the order</Link></>}
        </p>
      )}
      {pausedByFailures(sub) && (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-heading">
          Paused automatically: billing failed {MAX_FAILURES} times in a row{sub.lastError ? ` (${sub.lastError})` : ''}. Fix the problem, then resume it. Nothing was billed for the dates it missed while failing.
        </p>
      )}
      {sub.status === 'active' && sub.failureCount > 0 && (
        <p role="alert" className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-heading">
          The last billing attempt failed{sub.lastError ? ` (${sub.lastError})` : ''}. It will be tried again automatically. After {MAX_FAILURES} failures in a row it pauses itself ({sub.failureCount} so far).
        </p>
      )}
      {sub.status === 'completed' && <p role="status" className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-heading">This subscription has finished: it reached its end date or its last invoice. No more invoices will be created.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="sub-items">
            <h2 id="sub-items" className="mb-1 text-base font-semibold text-heading">Every invoice</h2>
            <p className="mb-4 text-sm text-muted">
              <span className="capitalize">{everyText(sub.intervalUnit, sub.intervalCount)}</span>, {formatMoney(sub.perRun.totalMinor, sub.currency)} each time.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Items on every invoice</caption>
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Product</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.items.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="py-3 pr-3 font-medium text-heading">{item.productName}</td>
                      <td className="px-3 py-3 text-right">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">{formatMoney(item.unitPriceMinor, sub.currency)}</td>
                      <td className="py-3 pl-3 text-right font-medium text-heading">{formatMoney(item.unitPriceMinor * item.quantity, sub.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 border-t border-border/60 pt-4"><TotalsSummary currency={sub.currency} {...sub.perRun} /></div>
            {sub.taxRateBps > 0 && <p className="mt-1 text-right text-xs text-muted">Tax at {sub.taxRateBps / 100}%</p>}
            {sub.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-heading">Internal notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-body">{sub.notes}</p>
              </div>
            )}
          </section>

          <section aria-labelledby="sub-history">
            <h2 id="sub-history" className="mb-3 text-base font-semibold text-heading">Billing history</h2>
            <RunsTable subscriptionId={sub.id} />
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-6 text-sm" aria-label="Subscription details">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Next invoice</p>
            <p className="mt-0.5 text-heading">{sub.nextRunOn ? day(sub.nextRunOn) : sub.status === 'paused' ? 'None while paused' : 'None'}</p>
            {sub.upcoming.length > 1 && (
              <p className="mt-1 text-xs text-muted">Then {sub.upcoming.slice(1).map(day).join(', ')}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Started</p>
            <p className="mt-0.5 text-heading">{day(sub.startOn)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Ends</p>
            <p className="mt-0.5 text-heading">{ends}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Invoices created</p>
            <p className="mt-0.5 text-heading">{sub.maxRuns ? `${sub.runCount} of ${sub.maxRuns}` : sub.runCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Payment due</p>
            <p className="mt-0.5 text-heading">{sub.dueDays === 0 ? 'On the day it is created' : `${sub.dueDays} day${sub.dueDays === 1 ? '' : 's'} after it is created`}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Emailed automatically</p>
            <p className="mt-0.5 text-heading">{sub.autoSend ? 'Yes, to the contact' : 'No, you send each invoice yourself'}</p>
          </div>
          {sub.lastAttemptAt && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Last billing attempt</p>
              <p className="mt-0.5 text-heading">{when(sub.lastAttemptAt)}</p>
            </div>
          )}
          {sub.contactId && <Link to={`/contacts/${sub.contactId}/edit`} className="link-action block">Open contact</Link>}
        </aside>
      </div>
    </>
  )
}
