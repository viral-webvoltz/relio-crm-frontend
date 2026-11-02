import { kindLabel, type Rule, type StepEdge, type StepNode } from './graph'

// A dry run in the browser: walks the graph against a sample record and says what each step would do.
// Nothing is sent to the server, so it is safe to try as often as you like.
export type Outcome = 'ran' | 'true' | 'false'
export type TraceStep = { nodeId: string; label: string; outcome: Outcome; detail: string }

const MAX_STEPS = 100

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, key) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined), obj)
const text = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))
const fill = (template: string, sample: unknown) => template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => text(get(sample, key)))

export function ruleMatches(rule: Rule, sample: unknown): boolean {
  const raw = get(sample, rule.field.trim())
  const a = text(raw).trim().toLowerCase()
  const b = rule.value.trim().toLowerCase()
  const num = [Number(text(raw)), Number(rule.value)]
  const numeric = text(raw).trim() !== '' && rule.value.trim() !== '' && num.every(Number.isFinite)
  switch (rule.operator) {
    case 'equals': return a === b
    case 'not_equals': return a !== b
    case 'contains': return a.includes(b)
    case 'not_contains': return !a.includes(b)
    case 'starts_with': return a.startsWith(b)
    case 'ends_with': return a.endsWith(b)
    case 'gt': return numeric && num[0]! > num[1]!
    case 'gte': return numeric && num[0]! >= num[1]!
    case 'lt': return numeric && num[0]! < num[1]!
    case 'lte': return numeric && num[0]! <= num[1]!
    case 'in': return b.split(',').map((s) => s.trim()).includes(a)
    case 'is_empty': return a === ''
    case 'is_not_empty': return a !== ''
    case 'changed': return raw !== undefined // in the sample, "changed" means the field is present
  }
}

export function simulate(nodes: StepNode[], edges: StepEdge[], sample: unknown): { steps: TraceStep[]; notReached: string[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const steps: TraceStep[] = []
  const seen = new Set<string>()
  const queue = nodes.filter((n) => n.data.kind === 'trigger').map((n) => n.id)

  while (queue.length && steps.length < MAX_STEPS) {
    const node = byId.get(queue.shift()!)
    if (!node || seen.has(node.id)) continue
    seen.add(node.id)
    const d = node.data
    let outcome: Outcome = 'ran'
    let detail = ''
    switch (d.kind) {
      case 'trigger':
        detail = d.config.event ? `Starts when "${d.config.event}" happens.` : 'No event chosen yet.'
        break
      case 'condition': {
        const results = d.config.rules.map((r) => ruleMatches(r, sample))
        const pass = d.config.mode === 'all' ? results.every(Boolean) : results.some(Boolean)
        outcome = pass ? 'true' : 'false'
        detail = `${results.filter(Boolean).length} of ${results.length} rules matched (${d.config.mode === 'all' ? 'all needed' : 'any needed'}) → ${outcome} branch.`
        break
      }
      case 'create_task':
        detail = `Would create the task "${fill(d.config.title, sample)}" (${d.config.priority} priority${d.config.dueInDays ? `, due in ${d.config.dueInDays} days` : ''}).`
        break
      case 'notify':
        detail = `Would send the notification "${fill(d.config.title, sample)}".`
        break
      case 'update_record':
        detail = `Would set ${d.config.field} to "${fill(d.config.value, sample)}".`
        break
      case 'send_email':
        detail = `Would email "${fill(d.config.subject, sample)}" to ${fill(d.config.to, sample) || '(nobody)'}.`
        break
      case 'http_request':
        detail = `Would send a ${d.config.method} request to ${d.config.url || '(no address)'}.`
        break
      case 'delay':
        detail = `Would wait ${d.config.amount} ${d.config.unit}, then continue.`
        break
    }
    steps.push({ nodeId: node.id, label: kindLabel(d.kind), outcome, detail })
    const handle = d.kind === 'condition' ? outcome : 'next'
    edges.filter((e) => e.source === node.id && (e.sourceHandle ?? 'next') === handle).forEach((e) => queue.push(e.target))
  }
  return { steps, notReached: nodes.filter((n) => !seen.has(n.id)).map((n) => n.id) }
}

/** A starting sample: every "equals" rule's value is filled in, so the first test follows the "true" branch. */
export function defaultSample(nodes: StepNode[]): string {
  const sample: Record<string, string> = { id: 'sample-id', title: 'Sample record' }
  for (const n of nodes) {
    if (n.data.kind !== 'condition') continue
    for (const r of n.data.config.rules) if (r.field.trim() && r.operator === 'equals') sample[r.field.trim()] = r.value
  }
  return JSON.stringify(sample, null, 2)
}

export const parseSample = (raw: string): { ok: true; value: unknown } | { ok: false; message: string } => {
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? { ok: true, value } : { ok: false, message: 'The sample must be a JSON object, like {"status": "won"}.' }
  } catch {
    return { ok: false, message: 'That is not valid JSON. Check the commas and quotes.' }
  }
}
