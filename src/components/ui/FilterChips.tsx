import { X } from 'lucide-react'

export type FilterChip = { label: string; onRemove: () => void }

// Shows what is currently filtering a list, each removable, plus "Clear all". Renders nothing when no filter is active.
export function FilterChips({ chips, onClear }: { chips: (FilterChip | false | null | undefined | '')[]; onClear: () => void }) {
  const active = chips.filter((chip): chip is FilterChip => Boolean(chip))
  if (active.length === 0) return null
  return (
    <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {active.map((chip) => (
        <span key={chip.label} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-xs font-medium text-primary">
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove filter: ${chip.label}`} className="grid size-6 place-items-center rounded-full hover:bg-primary/10">
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClear} className="link-action px-1 text-xs">Clear all</button>
    </div>
  )
}
