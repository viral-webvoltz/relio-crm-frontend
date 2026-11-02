import { Check, Copy, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

// Shown right after a webhook is created. The API never returns the secret again, so it can only be dismissed with the button
// (Esc and a backdrop click are ignored on purpose, to avoid losing it by accident).
export function SecretDialog({ secret, onDone }: { secret: string | null; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [attempt, setAttempt] = useState<{ secret: string | null; result: 'yes' | 'failed' }>({ secret: null, result: 'failed' })
  const copied = attempt.secret === secret ? attempt.result : null // a new secret starts with a clean state

  useEffect(() => {
    if (secret && !dialog.current?.open) dialog.current?.showModal()
    if (!secret && dialog.current?.open) dialog.current.close()
  }, [secret])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret ?? '')
      setAttempt({ secret, result: 'yes' })
    } catch {
      setAttempt({ secret, result: 'failed' }) // clipboard blocked: the text is selectable below
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="secret-title"
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {secret && (
        <div className="space-y-4 p-6">
          <h2 id="secret-title" className="flex items-center gap-2 text-lg font-semibold text-heading">
            <KeyRound className="size-5 text-primary" aria-hidden /> Your signing secret
          </h2>
          <p role="alert" className="rounded-xl bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
            Copy it now. You won’t be able to see this secret again.
          </p>
          <p className="text-sm text-body">Use it to check that events really come from this app: each request is signed with it (HMAC-SHA256).</p>
          <code className="block select-all break-all rounded-xl bg-background p-3 text-sm text-heading">{secret}</code>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={copy}>
              {copied === 'yes' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied === 'yes' ? 'Copied' : 'Copy secret'}
            </Button>
            <span role="status" aria-live="polite" className="text-sm text-muted">
              {copied === 'failed' && 'Could not copy automatically. Select the text above and copy it.'}
            </span>
          </div>
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button onClick={onDone}>I’ve saved it</Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
