import { ShoppingCart } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { FieldLabel, useFieldIds } from '@/components/ui/FieldParts'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { quoteErrorText } from '../errors'
import { useConvertQuote } from '../hooks/useQuotes'

type Target = 'order' | 'invoice'

// Turns an accepted quote into an order (and optionally its invoice) at the quoted prices. If anything fails nothing is created.
export function ConvertQuoteButton({ quoteId, number }: { quoteId: string; number: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Target>('order')
  const [dueDate, setDueDate] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())
  const canInvoice = useCan('invoices.create')
  const ids = useFieldIds()
  const convert = useConvertQuote(quoteId, key)
  const result = convert.data

  const show = () => {
    setTarget('order')
    setDueDate('')
    setKey(crypto.randomUUID())
    convert.reset()
    setOpen(true)
    dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()

  return (
    <>
      <button type="button" className="btn-primary gap-1.5" onClick={show}>
        <ShoppingCart className="size-4" aria-hidden /> Turn into order
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="convert-quote-title"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialog.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {open && !result && (
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!convert.isPending) convert.mutate({ target, dueDate: dueDate || null })
            }}
          >
            <h2 id="convert-quote-title" className="text-lg font-semibold text-heading">Turn quote #{number} into an order</h2>
            <p className="text-sm text-body">The order uses the prices the customer accepted. Product stock is reserved straight away.</p>
            {canInvoice && (
              <div className="space-y-1.5">
                <label htmlFor="convert-target" className="text-sm font-medium text-heading">What to create</label>
                <Select id="convert-target" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
                  <option value="order">Order only</option>
                  <option value="invoice">Order and invoice</option>
                </Select>
              </div>
            )}
            {canInvoice && target === 'invoice' && (
              <div className="space-y-1.5">
                <FieldLabel id={ids.id} label="Invoice due date (optional)" />
                <DatePicker id={ids.id} value={dueDate} onChange={setDueDate} />
              </div>
            )}
            {convert.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{quoteErrorText(convert.error)}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" loading={convert.isPending}>{convert.isPending ? 'Creating…' : target === 'invoice' ? 'Create order and invoice' : 'Create order'}</Button>
            </div>
          </form>
        )}
        {open && result && (
          <div className="space-y-4 p-6">
            <h2 id="convert-quote-title" className="text-lg font-semibold text-heading">Done</h2>
            <p role="status" className="text-sm text-body">
              Order #{result.order.orderNumber}{result.invoice ? ` and invoice #${result.invoice.invoiceNumber} were` : ' was'} created from this quote.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {result.invoice && <Link to={`/invoices/${result.invoice.id}`} className="btn-ghost" onClick={close}>Open invoice</Link>}
              <Link to={`/orders/${result.order.id}`} className="btn-primary" onClick={close}>Open order</Link>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
