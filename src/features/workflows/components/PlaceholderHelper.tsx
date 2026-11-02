import type { FieldMeta } from '../types'

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g
// What is left after the complete {{names}} are removed: a stray {{ or }}, or a single-brace {email}.
const BROKEN = /\{\{|\}\}|\{[\w.\s]+\}/

const BUILT_IN: Record<string, string> = { id: "the record's ID", event: 'the name of the event' }

type Found = { token: string; label?: string }

// Which {{placeholders}} a piece of text uses, and whether each one exists on this trigger's record.
function inspectPlaceholders(text: string, fields: FieldMeta[]) {
  const byKey = new Map(fields.map((f) => [f.key, f.label]))
  const known: Found[] = []
  const unknown: Found[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(TOKEN)) {
    const key = match[1] ?? ''
    if (seen.has(key)) continue
    seen.add(key)
    const label = BUILT_IN[key] ?? byKey.get(key.split('.')[0] ?? key)
    ;(label ? known : unknown).push({ token: `{{${key}}}`, label })
  }
  return { known, unknown, broken: BROKEN.test(text.replace(TOKEN, '')) }
}

// Click a field to put its {{placeholder}} into the box above, so nobody has to remember or spell the names.
export function PlaceholderChips({ fields, onInsert }: { fields: FieldMeta[]; onInsert: (key: string) => void }) {
  if (fields.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Insert a field">
      <span className="text-xs text-muted">Insert:</span>
      {fields.map((f) => (
        <button
          key={f.key}
          type="button"
          title={`{{${f.key}}}`}
          onClick={() => onInsert(f.key)}
          className="min-h-7 rounded-full border border-border bg-surface px-2.5 text-xs font-medium text-body hover:border-primary hover:text-primary"
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// Reads the text back in plain words: what each placeholder will be replaced with, and which ones will come out blank.
export function PlaceholderCheck({ text, fields }: { text: string; fields: FieldMeta[] }) {
  const { known, unknown, broken } = inspectPlaceholders(text, fields)
  if (known.length === 0 && unknown.length === 0 && !broken) return null
  return (
    <ul className="space-y-0.5 text-xs" aria-live="polite">
      {known.map((f) => (
        <li key={f.token} className="text-success">
          <code>{f.token}</code> will be filled with {f.label}
        </li>
      ))}
      {unknown.map((f) => (
        <li key={f.token} className="text-warning">
          <code>{f.token}</code> is not a field here, so it will be blank. Pick one from the list above.
        </li>
      ))}
      {broken && <li className="text-warning">A placeholder is missing a brace. It should look like {'{{email}}'}.</li>}
    </ul>
  )
}
