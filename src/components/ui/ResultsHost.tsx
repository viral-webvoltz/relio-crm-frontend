import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

export type Failure = { label: string; code: string; message: string }
type Request = { title: string; failures: Failure[] }

// Module-level bridge, like ConfirmHost: any handler can show "why did these fail" without wiring state per page.
let present: ((request: Request) => void) | null = null
export const showFailures = (request: Request) => present?.(request)

export function ResultsHost() {
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

  return (
    <dialog
      ref={dialog}
      aria-labelledby="results-title"
      onClose={() => setRequest(null)}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {request && (
        <div className="space-y-4 p-6">
          <h2 id="results-title" className="text-lg font-semibold text-heading">{request.title}</h2>
          <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/70">
            {request.failures.map((f, i) => (
              <li key={`${f.label}-${i}`} className="px-4 py-3 text-sm">
                <p className="font-medium text-heading">{f.label}</p>
                <p className="text-muted">{f.message}</p>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={() => dialog.current?.close()}>Close</Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
