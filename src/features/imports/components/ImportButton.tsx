import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { ImportResource } from '../api/importsApi'
import { ImportWizard } from './ImportWizard'

type Props = {
  resource: ImportResource
  /** Plural name used in the dialog title, e.g. "leads". Defaults to the resource. */
  noun?: string
}

// Opens the import wizard in a native modal dialog (focus trap, Esc to close). The wizard is only mounted while open, so it starts fresh each time.
export function ImportButton({ resource, noun }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true)
          dialog.current?.showModal()
        }}
      >
        <Upload className="size-4" aria-hidden /> Import
      </Button>
      <dialog
        ref={dialog}
        aria-label={`Import ${noun ?? resource}`}
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {open && <ImportWizard resource={resource} noun={noun} onClose={() => dialog.current?.close()} />}
      </dialog>
    </>
  )
}
