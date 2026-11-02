import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Options = { title?: string; confirmLabel?: string; tone?: 'danger' | 'primary'; inputLabel?: string }
type Request = Options & { message: string; resolve: (value: string | null) => void }

// Module-level bridge so event handlers can `await confirmDialog(...)` like window.confirm, without wiring state per page.
let present: ((request: Request) => void) | null = null
const ask = (message: string, options: Options) => new Promise<string | null>((resolve) => (present ? present({ ...options, message, resolve }) : resolve(null)))

export const confirmDialog = async (message: string, options: Options = {}) =>
  (await ask(message, { title: 'Are you sure?', confirmLabel: 'Delete', tone: 'danger', ...options })) !== null

// Resolves to the typed text, or null when cancelled.
export const promptDialog = (message: string, options: Options = {}) =>
  ask(message, { title: 'Add a note', confirmLabel: 'Continue', tone: 'primary', inputLabel: 'Note', ...options })

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    present = setRequest
    return () => {
      present = null
    }
  }, [])
  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal()
  }, [request])

  const finish = (value: string | null) => {
    request?.resolve(value)
    dialog.current?.close()
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      onClose={() => {
        request?.resolve(null) // Esc or backdrop; no-op if already answered
        setRequest(null)
      }}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {request && (
        <form
          method="dialog"
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            finish(String(new FormData(event.currentTarget).get('note') ?? ''))
          }}
        >
          <h2 id="confirm-title" className="text-lg font-semibold text-heading">{request.title}</h2>
          <p className="text-sm text-body">{request.message}</p>
          {request.inputLabel && (
            <label className="block space-y-1.5 text-sm font-medium text-heading">
              {request.inputLabel}
              <input name="note" autoFocus className="input-base font-normal" />
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => finish(null)}>Cancel</Button>
            <Button type="submit" autoFocus={!request.inputLabel} className={cn(request.tone === 'danger' && 'bg-destructive hover:bg-destructive')}>
              {request.confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  )
}
