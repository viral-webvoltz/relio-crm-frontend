import { useMutation } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { httpClient, type ApiError } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Emails the invoice to the customer (or to another address). One idempotency key per opened dialog,
// so a double-click queues a single email.
export function SendInvoiceButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())
  const problem = to.trim() && !EMAIL.test(to.trim()) ? 'Enter a valid email address.' : ''

  const send = useMutation<unknown, ApiError, void>({
    mutationFn: () => httpClient.post(`/invoices/${invoiceId}/send`, to.trim() ? { to: to.trim() } : {}, idempotent(key)),
    onSuccess: () => {
      toast.success(`${label} is on its way`, { description: 'The email was queued for sending.' })
      close()
    },
  })

  const show = () => {
    setTo('')
    setKey(crypto.randomUUID())
    send.reset()
    setOpen(true)
    dialog.current?.showModal()
  }
  function close() {
    dialog.current?.close()
  }

  const errorText = send.error ? (send.error.code === 'MAIL_NOT_CONFIGURED' ? 'Email sending is not set up yet. Ask an administrator to configure it.' : send.error.message) : ''

  return (
    <>
      <button type="button" className="btn-ghost gap-1.5" onClick={show}>
        <Mail className="size-4" aria-hidden /> Send by email
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="send-invoice-title"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialog.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {open && (
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!problem && !send.isPending) send.mutate()
            }}
          >
            <h2 id="send-invoice-title" className="text-lg font-semibold text-heading">Email {label}</h2>
            <p className="text-sm text-body">It goes to the customer's email on file unless you enter a different address.</p>
            <div className="space-y-1.5">
              <label htmlFor="send-invoice-to" className="text-sm font-medium text-heading">Send to a different address (optional)</label>
              <input
                id="send-invoice-to"
                type="email"
                inputMode="email"
                autoComplete="off"
                className="input-base aria-invalid:border-destructive"
                placeholder="name@example.com"
                value={to}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? 'send-invoice-problem' : undefined}
                onChange={(e) => setTo(e.target.value)}
              />
              {problem && <p id="send-invoice-problem" className="text-xs text-destructive">{problem}</p>}
            </div>
            {errorText && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorText}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={send.isPending || Boolean(problem)}>{send.isPending ? 'Sending…' : 'Send email'}</Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
