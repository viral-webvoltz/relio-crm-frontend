import { AlertTriangle, Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { apiBaseUrl } from '../usage'
import type { CreatedApiKey } from '../types'

// The server returns the key once and stores only a hash, so this is the only chance to copy it. It can be closed only after
// confirming the copy (Esc and a click outside are ignored), and the secret is cleared the moment the dialog closes.
function Reveal({ created, onDone }: { created: CreatedApiKey; onDone: () => void }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.key)
      setCopied('yes')
    } catch {
      setCopied('failed') // clipboard blocked: the key is selectable in the box
    }
  }

  return (
    <div className="space-y-4 p-6">
      <h2 id="reveal-key-title" className="text-lg font-semibold text-heading">Copy your new key</h2>
      <p role="alert" className="flex gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-heading">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>This is the only time you will see “{created.name}”. We keep no copy. If you lose it, revoke it and make a new one.</span>
      </p>
      <div className="space-y-1.5">
        <label htmlFor="new-api-key" className="text-sm font-medium text-heading">Your key</label>
        <div className="flex gap-2">
          <input id="new-api-key" readOnly autoComplete="off" spellCheck={false} value={created.key} onFocus={(e) => e.currentTarget.select()} className="input-base min-w-0 flex-1 font-mono text-xs" />
          <Button type="button" variant="ghost" onClick={copy}>
            {copied === 'yes' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied === 'yes' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p role="status" className="min-h-5 text-xs text-muted">{copied === 'yes' ? 'Copied to your clipboard.' : copied === 'failed' ? 'Could not copy automatically. Select the key above and copy it by hand.' : ''}</p>
      </div>
      <div className="rounded-xl bg-background p-3 text-xs text-body">
        <p className="mb-1 font-medium text-heading">How to use it</p>
        <p>Send it in a header named <code className="font-mono">Authorization</code> with the word <code className="font-mono">Bearer</code> before the key:</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-2 font-mono">{`curl -H "Authorization: Bearer YOUR_KEY" ${apiBaseUrl}/contacts`}</pre>
      </div>
      <label className="flex min-h-11 items-center gap-2.5 text-sm text-heading">
        <input type="checkbox" className="size-4 accent-primary" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I have copied this key and stored it somewhere safe.
      </label>
      <div className="flex justify-end">
        <Button type="button" disabled={!confirmed} onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

export function RevealKeyDialog({ created, onDone }: { created: CreatedApiKey | null; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (created && !dialog.current?.open) dialog.current?.showModal()
    if (!created && dialog.current?.open) dialog.current.close()
  }, [created])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="reveal-key-title"
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      {created && <Reveal key={created.id} created={created} onDone={onDone} />}
    </dialog>
  )
}
