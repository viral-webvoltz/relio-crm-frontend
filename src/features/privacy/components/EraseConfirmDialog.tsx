import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { summarise } from '../eraseLabels'

export type EraseRequest = {
  /** What the person typed to identify them, shown back in the sentence. */
  subjectLabel: string
  /** The exact text that must be typed to unlock the button. */
  phrase: string
  counts: Record<string, number>
}

function Body({ request, pending, error, onCancel, onConfirm }: { request: EraseRequest; pending: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('')
  const matches = typed.trim().toLowerCase() === request.phrase.toLowerCase()
  const groups = summarise(request.counts)

  return (
    <form
      className="flex max-h-[85vh] flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        if (matches && !pending) onConfirm()
      }}
    >
      <div className="space-y-4 overflow-y-auto p-6">
        <h2 id="erase-title" className="flex items-center gap-2 text-lg font-semibold text-heading"><AlertTriangle className="size-5 text-destructive" aria-hidden /> Erase this person's data?</h2>
        <p className="text-sm text-body">This is what will happen for <strong className="text-heading">{request.subjectLabel}</strong>. <strong className="text-destructive">It cannot be undone.</strong></p>
        {groups.length === 0 ? (
          <p className="text-sm text-muted">Nothing was found to erase.</p>
        ) : (
          groups.map((g) => (
            <div key={g.group}>
              <h3 className="text-sm font-semibold text-heading">{g.title}</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-body">
                {g.rows.map((r) => <li key={r.label}>{r.label}: {r.count}</li>)}
              </ul>
            </div>
          ))
        )}
        <div className="space-y-1.5">
          <label htmlFor="erase-confirm" className="text-sm font-medium text-heading">To confirm, type <span className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">{request.phrase}</span></label>
          <input id="erase-confirm" autoFocus autoComplete="off" spellCheck={false} className="input-base" value={typed} onChange={(e) => setTyped(e.target.value)} aria-describedby="erase-hint" />
          <p id="erase-hint" className="text-xs text-muted">The button stays off until what you type matches exactly (capital letters do not matter).</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
        <button type="submit" disabled={!matches || pending || groups.length === 0} aria-busy={pending || undefined} className="btn-primary bg-destructive hover:bg-destructive/90 disabled:opacity-50">
          {pending ? 'Erasing…' : 'Erase permanently'}
        </button>
      </div>
    </form>
  )
}

export function EraseConfirmDialog({ request, pending, error, onCancel, onConfirm }: { request: EraseRequest | null; pending: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal()
    if (!request && dialog.current?.open) dialog.current.close()
  }, [request])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="erase-title"
      // Esc closes it, but not while the erase is running.
      onCancel={(event) => {
        if (pending) event.preventDefault()
      }}
      onClose={() => request && !pending && onCancel()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-destructive/30 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      {request && <Body key={request.phrase + request.subjectLabel} request={request} pending={pending} error={error} onCancel={onCancel} onConfirm={onConfirm} />}
    </dialog>
  )
}
