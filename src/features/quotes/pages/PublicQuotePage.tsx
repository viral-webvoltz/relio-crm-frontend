import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { ErrorState } from '@/components/ui/Skeleton'
import { TotalsSummary } from '@/features/orders/components/TotalsSummary'
import { formatMoney } from '@/lib/money'
import { usePublicQuote, useRespondToQuote } from '../hooks/useQuotes'
import type { PublicQuote } from '../types'

const TOKEN = /^[a-f0-9]{64}$/
const day = (iso: string) => format(parseISO(iso), 'd MMMM yyyy')

const answerSchema = z.object({
  name: z.string().trim().min(1, 'Please type your name').max(120, 'Keep it under 120 characters'),
  note: z.string().trim().max(1000, 'Keep it under 1000 characters'),
})
type AnswerValues = z.infer<typeof answerSchema>

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-8">{children}</main>
)

// Plain notice shown for a link that does not (or no longer does) open a quote.
function NotValid() {
  return (
    <Shell>
      <div className="card space-y-2 p-8 text-center">
        <h1 className="text-xl font-semibold text-heading">This link doesn’t open a quote</h1>
        <p className="text-sm text-body">It may have been typed or copied incompletely, or the company sent you a newer link. Please use the latest email, or ask them to send the quote again.</p>
      </div>
    </Shell>
  )
}

function Outcome({ quote }: { quote: PublicQuote }) {
  const by = quote.respondedByName ? ` by ${quote.respondedByName}` : ''
  const at = quote.respondedAt ? ` on ${day(quote.respondedAt)}` : ''
  if (quote.status === 'accepted')
    return (
      <p role="status" className="flex items-start gap-3 rounded-xl bg-success/10 px-4 py-3 text-sm text-heading">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <span><strong>Quote accepted</strong>{by}{at}. Thank you, {quote.organizationName} will be in touch with the next steps.</span>
      </p>
    )
  if (quote.status === 'rejected')
    return (
      <p role="status" className="flex items-start gap-3 rounded-xl bg-background px-4 py-3 text-sm text-heading ring-1 ring-border">
        <XCircle className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <span><strong>Quote declined</strong>{at}. If you change your mind, ask {quote.organizationName} for a new quote.</span>
      </p>
    )
  return (
    <p role="status" className="flex items-start gap-3 rounded-xl bg-warning/10 px-4 py-3 text-sm text-heading">
      <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <span><strong>This quote has expired.</strong> Please ask {quote.organizationName} for an updated one.</span>
    </p>
  )
}

function AnswerForm({ token, quote }: { token: string; quote: PublicQuote }) {
  const respond = useRespondToQuote(token)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<AnswerValues>({ resolver: zodResolver(answerSchema), defaultValues: { name: '', note: '' } })
  const total = formatMoney(quote.totalMinor, quote.currency)

  // If the quote changed under the customer (already answered, expired, link replaced), show the real state instead of an error.
  const onError = (e: { message: string }) => toast.error(e.message)

  const accept = async (values: AnswerValues) => {
    if (!(await confirmDialog(`Accept this quote for ${total}? You are agreeing to the prices and terms shown on this page.`, { title: 'Accept quote?', confirmLabel: 'Accept quote', tone: 'primary' }))) return
    respond.mutate({ accept: true, name: values.name, note: values.note }, { onSuccess: () => toast.success('Thank you. Your acceptance was sent.'), onError })
  }
  const decline = async () => {
    if (!(await confirmDialog('Decline this quote? The company will be told you are not going ahead.', { title: 'Decline quote?', confirmLabel: 'Decline quote' }))) return
    respond.mutate({ accept: false, note: getValues('note') }, { onSuccess: () => toast.success('Your answer was sent.'), onError })
  }

  return (
    <form onSubmit={handleSubmit(accept)} noValidate className="card space-y-4 p-6" aria-labelledby="answer-title">
      <h2 id="answer-title" className="text-base font-semibold text-heading">Your answer</h2>
      <Field label="Your name" required autoComplete="name" hint="So they know who accepted." error={errors.name?.message} {...register('name')} />
      <div>
        <label htmlFor="answer-note" className="mb-1.5 block text-sm font-medium text-heading">Message (optional)</label>
        <textarea id="answer-note" rows={3} aria-invalid={errors.note ? true : undefined} className="input-base h-auto py-2.5" {...register('note')} />
        {errors.note && <p className="mt-1 text-xs text-destructive">{errors.note.message}</p>}
      </div>
      {respond.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{respond.error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={respond.isPending} disabled={respond.isPending}>{respond.isPending ? 'Sending…' : 'Accept quote'}</Button>
        <Button type="button" variant="ghost" disabled={respond.isPending} onClick={decline}>Decline</Button>
      </div>
    </form>
  )
}

// The page a customer opens from their email. No account, no staff menu, no internal fields.
export function PublicQuotePage() {
  const { token = '' } = useParams()
  const valid = TOKEN.test(token)
  const query = usePublicQuote(token, valid)
  const loaded = query.data

  useEffect(() => {
    document.title = loaded ? `Quote #${loaded.quoteNumber} from ${loaded.organizationName}` : 'Quote'
  }, [loaded])

  if (!valid || query.error?.status === 404) return <NotValid />
  if (query.isPending) return <Shell><p role="status" className="p-8 text-center text-sm text-muted">Loading your quote…</p></Shell>
  if (query.isError) return <Shell><div className="card"><ErrorState message={query.error.message} onRetry={() => query.refetch()} /></div></Shell>
  const quote = query.data

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-sm font-medium text-muted">{quote.organizationName}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-heading">Quote #{quote.quoteNumber}</h1>
        <p className="mt-1 text-sm text-body">
          {quote.customerName ? `Prepared for ${quote.customerName}. ` : ''}
          {quote.validUntil ? `Valid until ${day(quote.validUntil)}.` : ''}
        </p>
      </header>

      {quote.canRespond ? null : <div className="mb-6"><Outcome quote={quote} /></div>}

      <section className="card mb-6 p-6" aria-labelledby="quote-lines">
        <h2 id="quote-lines" className="mb-4 text-base font-semibold text-heading">What’s included</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Items on this quote</caption>
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => (
                <tr key={`${item.name}-${i}`} className="border-t border-border/60">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-heading">{item.name}</div>
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
            <h3 className="text-sm font-medium text-heading">A note from {quote.organizationName}</h3>
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

      {quote.canRespond && <AnswerForm token={token} quote={quote} />}
    </Shell>
  )
}
