import { useId, useState } from 'react'

type Person = { id: string; fullName: string }
type Props = { people: Person[]; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }

// Search + checklist: a multi-select that is just real checkboxes, so keyboard and screen readers work without extra code.
export function MemberPicker({ people, value, onChange, disabled }: Props) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const chosen = new Set(value)
  const q = query.trim().toLowerCase()
  const shown = people.filter((p) => !q || p.fullName.toLowerCase().includes(q))
  const toggle = (id: string) => onChange(chosen.has(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={searchId} className="text-sm font-medium text-heading">Members</label>
        <span role="status" className="text-xs text-muted">{value.length} selected</span>
      </div>
      <input id={searchId} type="search" className="input-base" autoComplete="off" placeholder="Search people" value={query} disabled={disabled} onChange={(e) => setQuery(e.target.value)} />
      <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-border/70 p-1" aria-label="People">
        {shown.length === 0 && <li className="px-3 py-3 text-sm text-muted">No one matches “{query}”.</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-heading hover:bg-primary-soft">
              <input type="checkbox" className="size-4 accent-primary" checked={chosen.has(p.id)} disabled={disabled} onChange={() => toggle(p.id)} />
              {p.fullName}
            </label>
          </li>
        ))}
      </ul>
      {value.length > 0 && (
        <button type="button" className="link-action" disabled={disabled} onClick={() => onChange([])}>Clear all</button>
      )}
    </div>
  )
}
