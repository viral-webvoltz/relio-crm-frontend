import { Columns3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Item = { key: string; header: string; locked?: boolean }

// "Columns" menu: tick the columns to show. Locked ones (the main column) can't be hidden, so a table is never empty.
export function ColumnsMenu({ items, visible, onChange }: { items: Item[]; visible: ReadonlySet<string>; onChange: (keys: string[] | null) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const toggle = (key: string) => {
    const next = new Set(visible)
    if (!next.delete(key)) next.add(key)
    onChange(items.filter((i) => i.locked || next.has(i.key)).map((i) => i.key))
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        e.stopPropagation()
        setOpen(false)
        button.current?.focus()
      }}
    >
      <button ref={button} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="link-action gap-1.5 text-muted hover:text-heading">
        <Columns3 className="size-4" aria-hidden /> Columns
      </button>
      {open && (
        <div role="dialog" aria-label="Choose columns" className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.key}>
                <label className="flex min-h-9 items-center gap-2.5 rounded-lg px-2 text-sm text-heading hover:bg-primary-soft">
                  <input type="checkbox" className="size-4 accent-primary" checked={item.locked || visible.has(item.key)} disabled={item.locked} onChange={() => toggle(item.key)} />
                  {item.header}
                  {item.locked && <span className="ml-auto text-xs text-muted">Always on</span>}
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="link-action mt-1 w-full justify-center" onClick={() => onChange(null)}>Show all</button>
        </div>
      )}
    </div>
  )
}
