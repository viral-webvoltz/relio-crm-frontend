import { FlaskConical } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { FieldMeta } from '@/features/workflows/types'
import { resources } from '../fields'
import { useTestRules } from '../hooks/useAssignment'
import { personName } from '../summary'
import type { Resource } from '../types'

type Person = { id: string; fullName: string }

function SampleField({ meta, value, people, onChange }: { meta: FieldMeta; value: string; people: Person[]; onChange: (v: string) => void }) {
  const id = useId()
  const options = meta.type === 'enum' ? (meta.options ?? []).map((o) => ({ value: o, label: o })) : meta.type === 'user' ? people.map((p) => ({ value: p.id, label: p.fullName })) : null
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-heading">{meta.label}</label>
      {options ? (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Not set</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      ) : (
        <input id={id} className="input-base" autoComplete="off" type={meta.type === 'number' ? 'number' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// "What would happen to a record like this?" A dry run on the server: it names the rule and the person, and changes nothing
// (not even whose turn it is in a rotation).
export function TryItPanel({ resource, fields, people }: { resource: Resource; fields: FieldMeta[]; people: Person[] }) {
  const test = useTestRules()
  const [sample, setSample] = useState<Record<string, string>>({})
  const noun = resources.find((r) => r.key === resource)!.noun[0]

  const run = () => {
    const filled = Object.fromEntries(Object.entries(sample).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, fields.find((f) => f.key === k)?.type === 'number' ? Number(v) : v.trim()]))
    test.mutate({ resource, sample: filled })
  }

  return (
    <section aria-labelledby="try-it" className="card space-y-4 p-6">
      <div>
        <h2 id="try-it" className="flex items-center gap-2 text-base font-semibold text-heading"><FlaskConical className="size-4" aria-hidden /> Try it</h2>
        <p className="mt-1 text-sm text-muted">Describe a new {noun} and see who it would go to. Nothing is assigned and no one is notified.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => <SampleField key={f.key} meta={f} value={sample[f.key] ?? ''} people={people} onChange={(v) => setSample((s) => ({ ...s, [f.key]: v }))} />)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={test.isPending} onClick={run}>{test.isPending ? 'Checking…' : 'Who would get it?'}</Button>
        <Button variant="ghost" onClick={() => { setSample({}); test.reset() }}>Clear</Button>
      </div>
      <div aria-live="polite">
        {test.isError && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{test.error.message}</p>}
        {test.data &&
          (test.data.match ? (
            <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-heading">
              It would go to <strong>{personName(people, test.data.match.userId)}</strong>, because of the rule “{test.data.match.ruleName}”.
            </p>
          ) : (
            <p className="rounded-xl bg-background px-3 py-2 text-sm text-body">No rule matches a {noun} like this, so it would stay unassigned. (A matching rule whose team has no active people is skipped.)</p>
          ))}
      </div>
    </section>
  )
}
