import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = { title: string; onClose: () => void; wide?: boolean; children: (close: () => void) => ReactNode }

// A native <dialog> (focus trap, Escape and inert background for free). Mount it only while open so its form starts fresh each time.
export function DialogShell({ title, onClose, wide, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = 'dialog-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  useEffect(() => dialog.current?.showModal(), [])
  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && close()}
      className={cn('m-auto max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm', wide ? 'max-w-2xl' : 'max-w-lg')}
    >
      <div className="space-y-4 p-6">
        <h2 id={titleId} className="text-lg font-semibold text-heading">{title}</h2>
        {children(close)}
      </div>
    </dialog>
  )
}
