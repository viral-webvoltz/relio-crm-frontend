import { X } from 'lucide-react'
import type { Tag } from '../types'

const HEX = /^#[0-9a-f]{6}$/i

// The colour is decoration; the name is always shown, so a tag never depends on colour alone.
export function TagChip({ tag, onRemove }: { tag: Pick<Tag, 'name' | 'color'>; onRemove?: () => void }) {
  const color = HEX.test(tag.color) ? tag.color : '#6b7280'
  return (
    <span className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium text-heading" style={{ backgroundColor: `${color}1f`, borderColor: `${color}66` }}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button type="button" aria-label={`Remove tag ${tag.name}`} onClick={onRemove} className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/10">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
