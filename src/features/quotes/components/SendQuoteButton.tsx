import { Copy, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { quoteErrorText } from '../errors'
import { useSendQuote } from '../hooks/useQuotes'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = { quoteId: string; number: number; /** Already sent once: sending again makes a new link and the old one stops working. */ resend: boolean }

// Sends the quote to the customer. One idempotency key per opened dialog, so a double-click emails once.
// The link is only ever returned by this request (the server keeps just a hash), so it is shown here, once, with a copy button.
export function SendQuoteButton({ quoteId, number, resend }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())
  const send = useSendQuote(quoteId, key)
  const problem = to.trim() && !EMAIL.test(to.trim()) ? 'Enter a valid email address.' : ''

  const show = () => {
    setTo('')
    setKey(crypto.randomUUID())
    send.reset()
    setOpen(true)
    dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.')
    }
  }

  const result = send.data

  return (
    <>
      <button type="button" className={resend ? 'btn-ghost gap-1.5' : 'btn-primary gap-1.5'} onClick={show}>
        <Send className="size-4" aria-hidden /> {resend ? 'Send again' : 'Send to customer'}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="send-quote-title"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialog.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {open && !result && (
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!problem && !send.isPending) send.mutate(to.trim() || undefined)
            }}
          >
            <h2 id="send-quote-title" className="text-lg font-semibold text-heading">Send quote #{number}</h2>
            <p className="text-sm text-body">
              The customer gets a private link where they can read the quote and accept or decline it. It goes to the contact’s email unless you enter a different address.
            </p>
            {resend && <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-heading">Sending again creates a new link. The link you sent before will stop working.</p>}
            <div className="space-y-1.5">
              <label htmlFor="send-quote-to" className="text-sm font-medium text-heading">Send to a different address (optional)</label>
              <input
                id="send-quote-to"
                type="email"
                inputMode="email"
                autoComplete="off"
                className="input-base aria-invalid:border-destructive"
                placeholder="name@example.com"
                value={to}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? 'send-quote-problem' : undefined}
                onChange={(e) => setTo(e.target.value)}
              />
              {problem && <p id="send-quote-problem" className="text-xs text-destructive">{problem}</p>}
            </div>
            {send.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{quoteErrorText(send.error)}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" loading={send.isPending} disabled={Boolean(problem)}>{send.isPending ? 'Sending…' : 'Send quote'}</Button>
            </div>
          </form>
        )}
        {open && result && (
          <div className="space-y-4 p-6">
            <h2 id="send-quote-title" className="text-lg font-semibold text-heading">{result.emailQueued ? 'Quote is on its way' : 'Quote link is ready'}</h2>
            <p role="status" className="text-sm text-body">
              {result.emailQueued
                ? 'We emailed the customer their link.'
                : 'No email was sent, because there is no address to send to or email isn’t set up. Share the link yourself.'}
            </p>
            <div className="space-y-1.5">
              <label htmlFor="send-quote-link" className="text-sm font-medium text-heading">Customer link</label>
              <input id="send-quote-link" readOnly className="input-base font-mono text-xs" value={result.link} onFocus={(e) => e.currentTarget.select()} />
              <p className="text-xs text-muted">This link is shown only now. If you lose it, send the quote again to get a new one.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => copy(result.link)}><Copy className="size-4" aria-hidden /> Copy link</Button>
              <Button type="button" onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
