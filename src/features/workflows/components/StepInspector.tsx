import { Plus, Trash2 } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { Select } from '@/components/ui/Select'
import { isTimedTrigger, needsValue, operators, kindLabel, weekdays, type ConfigMap, type Kind, type Rule, type StepData } from '../graph'
import { editableFields, triggers, type FieldMeta } from '../types'
import { PlaceholderChips, PlaceholderCheck } from './PlaceholderHelper'

const timezones: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

type Person = { id: string; fullName: string }
type Stage = { id: string; name: string }
type Output = { handle: string; value: string; options: { value: string; label: string }[] }
type Props = { outputs: Output[]; onConnect: (handle: string, targetId: string) => void; metaFailed?: boolean; data: StepData; trigger: string; orgTimezone?: string; fields: FieldMeta[]; people: Person[]; stages: Stage[]; onChange: (config: StepData['config']) => void; onRemove: () => void }

const MAX_RULES = 10

function Row({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-heading">{label}</label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

type TextProps = { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; multiline?: boolean; type?: string; placeholders?: FieldMeta[] }

// With `placeholders`, the box also offers the record's fields as buttons and says what each {{name}} typed in it will become.
const Text = ({ label, value, onChange, hint, placeholder, multiline, type = 'text', placeholders }: TextProps) => {
  const box = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const insert = (key: string) => {
    const el = box.current
    const token = `{{${key}}}`
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? start
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <Row label={label} hint={hint}>
      {(id) => (
        <>
          {multiline ? (
            <textarea id={id} ref={box} rows={3} className="input-base h-auto py-2" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input id={id} ref={box} type={type} className="input-base" autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
          )}
          {placeholders && <PlaceholderChips fields={placeholders} onInsert={insert} />}
          {placeholders && <PlaceholderCheck text={value} fields={placeholders} />}
        </>
      )}
    </Row>
  )
}

const Choice = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <Row label={label}>
    {(id) => (
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    )}
  </Row>
)

// The value box follows the field: a list for choices, users and stages, plain text otherwise.
function RuleValue({ rule, meta, people, stages, onChange }: { rule: Rule; meta?: FieldMeta; people: Person[]; stages: Stage[]; onChange: (v: string) => void }) {
  const pick = (options: { value: string; label: string }[], label: string) => <Choice label="Value" value={rule.value} onChange={onChange} options={[{ value: '', label }, ...options]} />
  if (meta?.type === 'enum') return pick((meta.options ?? []).map((o) => ({ value: o, label: o })), 'Choose…')
  if (meta?.type === 'user') return pick(people.map((p) => ({ value: p.id, label: p.fullName })), 'Choose a person…')
  if (meta?.type === 'stage' && stages.length) return pick(stages.map((s) => ({ value: s.id, label: s.name })), 'Choose a stage…')
  return <Text label="Value" value={rule.value} onChange={onChange} type={meta?.type === 'number' ? 'number' : 'text'} />
}

// Placeholders are plain text the server fills in when the workflow runs.
const PLACEHOLDER_HINT = 'Use {{id}}, {{event}} or a record field such as {{title}}.'

export function StepInspector({ data, trigger, orgTimezone, outputs, onConnect, metaFailed, fields, people, stages, onChange, onRemove }: Props) {
  const who = [{ value: 'actor', label: 'Whoever made the change' }, ...people.map((p) => ({ value: p.id, label: p.fullName }))]
  const set = <K extends Kind>(config: ConfigMap[K], patch: Partial<ConfigMap[K]>) => onChange({ ...config, ...patch } as StepData['config'])
  const editable = editableFields[trigger.split('.')[0] ?? ''] ?? []

  let body: ReactNode
  switch (data.kind) {
    case 'trigger': {
      const c = data.config
      const timed = isTimedTrigger(c.event)
      body = (
        <>
          <Choice label="When this happens" value={c.event} onChange={(event) => onChange({ ...c, event })} options={[{ value: '', label: 'Choose an event…' }, ...triggers.map((t) => ({ value: t.value, label: t.label }))]} />
          {timed && (
            <>
              <Text label="Time of day" type="time" value={c.at} onChange={(at) => onChange({ ...c, at })} />
              <Row label="Timezone" hint={`Runs once a day at this time on this clock. Leave empty to use your organization's timezone${orgTimezone ? ` (${orgTimezone})` : ''}.`}>
                {(id) => <input id={id} list="wf-timezones" className="input-base" autoComplete="off" placeholder={orgTimezone ?? 'Organization default'} value={c.timezone} onChange={(e) => onChange({ ...c, timezone: e.target.value })} />}
              </Row>
              <datalist id="wf-timezones">{timezones.map((z) => <option key={z} value={z} />)}</datalist>
              {c.event === 'schedule.weekly' && <Choice label="Day of the week" value={c.day} onChange={(day) => onChange({ ...c, day: day as typeof c.day })} options={weekdays.map((d) => ({ value: d.value, label: d.label }))} />}
              {c.event.endsWith('.overdue') && <p className="text-xs text-muted">Runs once for each record that became overdue in the last 7 days. Old overdue records are not replayed.</p>}
              {c.event.startsWith('schedule.') && <p className="text-xs text-muted">Runs with no record. Use steps that do not need one, like creating a task or sending a notification.</p>}
            </>
          )}
        </>
      )
      break
    }
    case 'condition': {
      const { rules, mode } = data.config
      const setRule = (i: number, patch: Partial<Rule>) => set(data.config, { rules: rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
      body = (
        <>
          <Choice label="Branch to “true” when" value={mode} onChange={(v) => set(data.config, { mode: v as 'all' | 'any' })} options={[{ value: 'all', label: 'All rules match' }, { value: 'any', label: 'Any rule matches' }]} />
          {metaFailed && <p role="status" className="text-xs text-muted">The list of fields could not be loaded. You can still type a field name.</p>}
          <datalist id="wf-fields">{fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</datalist>
          {rules.map((rule, i) => (
            <fieldset key={i} className="space-y-3 rounded-xl border border-border/70 p-3">
              <legend className="px-1 text-xs font-medium text-muted">Rule {i + 1}</legend>
              <Row label="Field">{(id) => <input id={id} list="wf-fields" className="input-base" autoComplete="off" placeholder="e.g. status" value={rule.field} onChange={(e) => setRule(i, { field: e.target.value })} />}</Row>
              <Choice label="Operator" value={rule.operator} onChange={(v) => setRule(i, { operator: v as Rule['operator'] })} options={operators.map((o) => ({ value: o.value, label: o.label }))} />
              {needsValue(rule.operator) && <RuleValue rule={rule} meta={fields.find((f) => f.key === rule.field)} people={people} stages={stages} onChange={(value) => setRule(i, { value })} />}
              {rules.length > 1 && (
                <button type="button" className="link-danger gap-1" onClick={() => set(data.config, { rules: rules.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-3.5" aria-hidden /> Remove rule
                </button>
              )}
            </fieldset>
          ))}
          <button type="button" className="btn-ghost h-9 gap-1.5" disabled={rules.length >= MAX_RULES} onClick={() => set(data.config, { rules: [...rules, { field: '', operator: 'equals', value: '' }] })}>
            <Plus className="size-4" aria-hidden /> Add rule
          </button>
        </>
      )
      break
    }
    case 'create_task': {
      const c = data.config
      body = (
        <>
          <Text label="Title" value={c.title} onChange={(title) => set(c, { title })} hint={PLACEHOLDER_HINT} placeholders={fields} />
          <Text label="Description" multiline value={c.description} onChange={(description) => set(c, { description })} placeholders={fields} />
          <Choice label="Priority" value={c.priority} onChange={(v) => set(c, { priority: v as typeof c.priority })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <Text label="Due in (days)" type="number" value={c.dueInDays} onChange={(dueInDays) => set(c, { dueInDays })} placeholder="No due date" />
          <Choice label="Assign to" value={c.assignTo} onChange={(assignTo) => set(c, { assignTo })} options={who} />
        </>
      )
      break
    }
    case 'notify': {
      const c = data.config
      body = (
        <>
          <Choice label="Send to" value={c.userId} onChange={(userId) => set(c, { userId })} options={who} />
          <Text label="Title" value={c.title} onChange={(title) => set(c, { title })} hint={PLACEHOLDER_HINT} />
          <Text label="Message (optional)" multiline value={c.body} onChange={(body) => set(c, { body })} placeholders={fields} />
        </>
      )
      break
    }
    case 'update_record': {
      const c = data.config
      body = (
        <>
          {editable.length ? (
            <Choice label="Field to set" value={c.field} onChange={(field) => set(c, { field })} options={[{ value: '', label: 'Choose a field…' }, ...editable.map((f) => ({ value: f, label: f }))]} />
          ) : (
            <p className="text-sm text-muted">Records from this trigger cannot be updated by a workflow.</p>
          )}
          <Text label="New value" value={c.value} onChange={(value) => set(c, { value })} hint={PLACEHOLDER_HINT} placeholders={fields} />
        </>
      )
      break
    }
    case 'send_email': {
      const c = data.config
      body = (
        <>
          <Text label="To" value={c.to} onChange={(to) => set(c, { to })} hint="An email address, or {{email}} to use the record's email." placeholders={fields} />
          <Text label="Subject" value={c.subject} onChange={(subject) => set(c, { subject })} hint={PLACEHOLDER_HINT} placeholders={fields} />
          <Text label="Message" multiline value={c.body} onChange={(body) => set(c, { body })} placeholders={fields} />
        </>
      )
      break
    }
    case 'http_request': {
      const c = data.config
      body = (
        <>
          <Choice label="Method" value={c.method} onChange={(v) => set(c, { method: v as typeof c.method })} options={[{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'GET', label: 'GET' }]} />
          <Text label="Address" type="url" value={c.url} onChange={(url) => set(c, { url })} placeholder="https://example.com/hook" hint="Must be a public https address." />
          <Text label="Body (JSON, optional)" multiline value={c.body} onChange={(body) => set(c, { body })} hint={PLACEHOLDER_HINT} placeholders={fields} />
        </>
      )
      break
    }
    case 'delay': {
      const c = data.config
      body = (
        <>
          <Text label="Wait for" type="number" value={c.amount} onChange={(amount) => set(c, { amount })} />
          <Choice label="Unit" value={c.unit} onChange={(v) => set(c, { unit: v as typeof c.unit })} options={[{ value: 'minutes', label: 'Minutes' }, { value: 'hours', label: 'Hours' }, { value: 'days', label: 'Days' }]} />
        </>
      )
    }
  }

  return (
    <section aria-label={`${kindLabel(data.kind)} settings`} className="space-y-4">
      <h2 className="text-base font-semibold text-heading">{kindLabel(data.kind)}</h2>
      {body}
      {outputs.length > 0 && (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold text-heading">What happens next</h3>
          {outputs.map((o) => (
            <Choice
              key={o.handle}
              label={data.kind === 'condition' ? `When ${o.handle}, go to` : 'Then go to'}
              value={o.value}
              onChange={(target) => onConnect(o.handle, target)}
              options={[{ value: '', label: 'Nothing — the path ends here' }, ...o.options]}
            />
          ))}
          <p className="text-xs text-muted">You can also drag from the dot under a step, or press the + button on the canvas.</p>
        </div>
      )}
      {data.kind !== 'trigger' && (
        <button type="button" className="link-danger gap-1" onClick={onRemove}>
          <Trash2 className="size-3.5" aria-hidden /> Delete this step
        </button>
      )}
    </section>
  )
}
