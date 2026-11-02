import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { kinds, type Kind } from '../graph'
import { kindIcons } from '../kindIcons'

type Props = { onPick: (kind: Kind) => void; label?: string; variant?: 'dot' | 'button'; align?: 'center' | 'right' }

// A "+" that opens the list of step types. Used on the canvas (after a step, on an arrow) and in the corner.
export function AddStepButton({ onPick, label = 'Add a step', variant = 'dot', align = 'center' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  return (
    <div ref={root} className="nodrag nopan relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={variant === 'dot' ? 'grid size-6 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm hover:border-primary hover:text-primary' : 'btn-ghost h-10 gap-1.5'}
      >
        <Plus className="size-4" aria-hidden /> {variant === 'button' && 'Add'}
      </button>
      {open && (
        <ul role="menu" aria-label="Step types" className={cn('nowheel absolute top-full z-30 mt-1.5 w-60 rounded-xl border border-border bg-surface p-1 shadow-xl', align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0')}>
          {kinds.map((k, i) => {
            const Icon = kindIcons[k.kind]
            return (
              <li key={k.kind} role="none">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus={i === 0}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-primary-soft"
                  onClick={() => {
                    setOpen(false)
                    onPick(k.kind)
                  }}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-heading">{k.label}</span>
                    <span className="block truncate text-xs text-muted">{k.hint}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
