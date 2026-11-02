import type { Edge, Node } from '@xyflow/react'
import { z } from 'zod'

// The workflow as a graph: one trigger, then steps joined by edges. Condition steps branch ("true" / "false").
export const MAX_NODES = 50

export const operators = [
  { value: 'equals', label: 'equals', needsValue: true },
  { value: 'not_equals', label: 'does not equal', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'not_contains', label: 'does not contain', needsValue: true },
  { value: 'starts_with', label: 'starts with', needsValue: true },
  { value: 'ends_with', label: 'ends with', needsValue: true },
  { value: 'gt', label: 'is greater than', needsValue: true },
  { value: 'gte', label: 'is at least', needsValue: true },
  { value: 'lt', label: 'is less than', needsValue: true },
  { value: 'lte', label: 'is at most', needsValue: true },
  { value: 'in', label: 'is one of (comma separated)', needsValue: true },
  { value: 'is_empty', label: 'is empty', needsValue: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false },
  { value: 'changed', label: 'was changed in this update', needsValue: false },
] as const
export type Operator = (typeof operators)[number]['value']
export const needsValue = (op: string) => operators.find((o) => o.value === op)?.needsValue ?? true

export type Rule = { field: string; operator: Operator; value: string }

export type ConfigMap = {
  trigger: { event: string; at: string; timezone: string; day: Weekday }
  condition: { mode: 'all' | 'any'; rules: Rule[] }
  create_task: { title: string; description: string; priority: 'low' | 'medium' | 'high'; dueInDays: string; assignTo: string }
  notify: { userId: string; title: string; body: string }
  update_record: { field: string; value: string }
  send_email: { to: string; subject: string; body: string }
  http_request: { method: 'POST' | 'PUT' | 'GET'; url: string; body: string }
  delay: { amount: string; unit: 'minutes' | 'hours' | 'days' }
}
export type Kind = keyof ConfigMap

export const weekdays = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
] as const
export type Weekday = (typeof weekdays)[number]['value']

// Triggers the server fires on a schedule (once a day, at the trigger's time and timezone) rather than on a user action.
export const isTimedTrigger = (event: string) => event.startsWith('schedule.') || event.endsWith('.overdue')
export const validTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const kinds: { kind: Kind; label: string; hint: string }[] = [
  { kind: 'condition', label: 'If / else', hint: 'Branch on one or more rules' },
  { kind: 'create_task', label: 'Create task', hint: 'Add a task for someone' },
  { kind: 'notify', label: 'Notify', hint: 'Send an in-app notification' },
  { kind: 'update_record', label: 'Update record', hint: 'Set a field on the record' },
  { kind: 'send_email', label: 'Send email', hint: 'Email a person or the contact' },
  { kind: 'http_request', label: 'HTTP request', hint: 'Call another system' },
  { kind: 'delay', label: 'Wait', hint: 'Pause before the next step' },
]
export const kindLabel = (kind: Kind) => (kind === 'trigger' ? 'Trigger' : (kinds.find((k) => k.kind === kind)?.label ?? kind))

export const defaults: { [K in Kind]: ConfigMap[K] } = {
  trigger: { event: '', at: '09:00', timezone: '', day: 'mon' },
  condition: { mode: 'all', rules: [{ field: '', operator: 'equals', value: '' }] },
  create_task: { title: '', description: '', priority: 'medium', dueInDays: '', assignTo: 'actor' },
  notify: { userId: 'actor', title: '', body: '' },
  update_record: { field: '', value: '' },
  send_email: { to: '', subject: '', body: '' },
  http_request: { method: 'POST', url: '', body: '' },
  delay: { amount: '1', unit: 'hours' },
}

export type StepData = { [K in Kind]: { kind: K; config: ConfigMap[K] } }[Kind]
export type StepNode = Node<StepData>
export type StepEdge = Edge

export const newNode = (kind: Kind, position: { x: number; y: number }): StepNode => ({
  id: crypto.randomUUID(),
  type: 'step',
  position,
  data: { kind, config: structuredClone(defaults[kind]) } as StepData,
})

const handleFor = (node: StepNode | undefined, edges: StepEdge[]) => {
  if (!node) return null
  const used = new Set(edges.filter((e) => e.source === node.id).map((e) => e.sourceHandle))
  const options = node.data.kind === 'condition' ? ['true', 'false'] : ['next']
  return options.find((h) => !used.has(h)) ?? null
}

/** The first free output of `node`, so "add after the selected step" can connect automatically. */
export const freeHandle = handleFor

export const makeEdge = (source: string, sourceHandle: string, target: string): StepEdge => ({
  id: `${source}:${sourceHandle}->${target}`,
  source,
  sourceHandle,
  target,
  type: 'step',
})

const reaches = (edges: StepEdge[], from: string, to: string): boolean => {
  const seen = new Set<string>()
  const stack = [from]
  while (stack.length) {
    const id = stack.pop()!
    if (id === to) return true
    if (seen.has(id)) continue
    seen.add(id)
    edges.filter((e) => e.source === id).forEach((e) => stack.push(e.target))
  }
  return false
}

/** Connection rules, enforced while dragging: no self-links, nothing into the trigger, one edge per output, no loops. */
export function canConnect(nodes: StepNode[], edges: StepEdge[], c: { source: string; target: string; sourceHandle?: string | null }) {
  if (c.source === c.target) return false
  if (nodes.find((n) => n.id === c.target)?.data.kind === 'trigger') return false
  if (edges.some((e) => e.source === c.source && e.sourceHandle === c.sourceHandle)) return false
  return !reaches(edges, c.target, c.source)
}

export type Problem = { nodeId?: string; message: string }

const isHttps = (value: string) => {
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

const text = (max: number, message: string) => z.string().trim().min(1, message).max(max, `keep it under ${max} characters.`)
const PLACEHOLDER = /^\{\{\s*[\w.]+\s*\}\}$/

// One schema per step type (messages are written for the person editing, not for developers). The server checks the same rules again.
const configSchemas: { [K in Kind]: z.ZodType } = {
  trigger: z
    .object({ event: z.string().min(1, 'choose an event.'), at: z.string(), timezone: z.string(), day: z.string() })
    .superRefine((c, ctx) => {
      if (!isTimedTrigger(c.event)) return
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.at)) ctx.addIssue({ code: 'custom', message: 'choose a time of day.' })
      if (c.timezone.trim() && !validTimezone(c.timezone.trim())) ctx.addIssue({ code: 'custom', message: 'choose a valid timezone, like Asia/Kolkata.' })
    }),
  condition: z.object({
    mode: z.enum(['all', 'any']),
    rules: z
      .array(
        z
          .object({ field: text(100, 'needs a field.'), operator: z.string(), value: z.string().max(200, 'the value is too long.') })
          .superRefine((r, ctx) => {
            if (needsValue(r.operator) && !r.value.trim()) ctx.addIssue({ code: 'custom', path: ['value'], message: 'needs a value.' })
            if (['gt', 'gte', 'lt', 'lte'].includes(r.operator) && r.value.trim() && !Number.isFinite(Number(r.value))) ctx.addIssue({ code: 'custom', path: ['value'], message: 'needs a number.' })
          }),
      )
      .min(1, 'add at least one rule.')
      .max(10, 'use at most 10 rules.'),
  }),
  create_task: z.object({
    title: text(200, 'enter a title.'),
    description: z.string().max(2000, 'the description is too long.'),
    priority: z.enum(['low', 'medium', 'high']),
    dueInDays: z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 365), 'due days must be a whole number from 0 to 365.'),
    assignTo: z.string().min(1, 'choose who to assign it to.'),
  }),
  notify: z.object({ userId: z.string().min(1, 'choose who to notify.'), title: text(200, 'enter a title.'), body: z.string().max(1000, 'the message is too long.') }),
  update_record: z.object({ field: text(60, 'choose a field.'), value: z.string().max(500, 'the value is too long.') }),
  send_email: z.object({
    to: z.string().trim().refine((v) => PLACEHOLDER.test(v) || z.email().safeParse(v).success, 'enter an email address, or {{email}}.'),
    subject: text(200, 'enter a subject.'),
    body: text(5000, 'enter a message.'),
  }),
  http_request: z.object({ method: z.enum(['POST', 'PUT', 'GET']), url: z.string().refine(isHttps, 'the address must be a valid https URL.'), body: z.string().max(5000, 'the body is too long.') }),
  delay: z
    .object({ amount: z.string(), unit: z.enum(['minutes', 'hours', 'days']) })
    .superRefine((c, ctx) => {
      const n = Number(c.amount)
      if (!Number.isInteger(n) || n < 1) return void ctx.addIssue({ code: 'custom', path: ['amount'], message: 'wait for a whole number of at least 1.' })
      if (n * { minutes: 1, hours: 60, days: 1440 }[c.unit] > 30 * 1440) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'a wait can be at most 30 days.' })
    }),
}

export function validate(nodes: StepNode[], edges: StepEdge[]): Problem[] {
  const out: Problem[] = []
  const triggers = nodes.filter((n) => n.data.kind === 'trigger')
  if (triggers.length !== 1) out.push({ message: 'A workflow needs exactly one trigger.' })
  if (nodes.length > MAX_NODES) out.push({ message: `A workflow can have at most ${MAX_NODES} steps.` })
  if (nodes.length < 2) out.push({ message: 'Add at least one step after the trigger.' })

  const linked = new Set(edges.flatMap((e) => [e.target]))
  for (const node of nodes) {
    const label = kindLabel(node.data.kind)
    const bad = (message: string) => out.push({ nodeId: node.id, message: `${label}: ${message}` })
    if (node.data.kind !== 'trigger' && !linked.has(node.id)) bad('not connected to the trigger.')
    const result = configSchemas[node.data.kind].safeParse(node.data.config)
    if (result.success) continue
    for (const issue of result.error.issues) {
      const rule = issue.path[0] === 'rules' && typeof issue.path[1] === 'number' ? `rule ${issue.path[1] + 1}: ` : ''
      bad(`${rule}${issue.message}`)
    }
  }
  return out
}

// ---- wire format -----------------------------------------------------------------------------------------------------

export type GraphPayload = {
  nodes: { id: string; type: Kind; position: { x: number; y: number }; config: Record<string, unknown> }[]
  edges: { id: string; source: string; sourceHandle: string; target: string }[]
}

const num = (v: string) => (v === '' ? undefined : Number(v))

// Numbers go as numbers, blanks are dropped; everything else is passed through as typed text (the server validates and sanitises).
function configToWire(d: StepData): Record<string, unknown> {
  switch (d.kind) {
    case 'create_task':
      return { ...d.config, title: d.config.title.trim(), dueInDays: num(d.config.dueInDays) }
    case 'delay':
      return { amount: Number(d.config.amount), unit: d.config.unit }
    case 'trigger':
      // The server rejects time, timezone and weekday on triggers that are not scheduled, so only send them when they apply.
      return isTimedTrigger(d.config.event) ? { event: d.config.event, at: d.config.at, ...(d.config.timezone.trim() && { timezone: d.config.timezone.trim() }), ...(d.config.event === 'schedule.weekly' && { day: d.config.day }) } : { event: d.config.event }
    case 'http_request':
      return { ...d.config, url: d.config.url.trim() }
    default:
      return { ...d.config }
  }
}

export const toGraphPayload = (nodes: StepNode[], edges: StepEdge[]): GraphPayload => ({
  nodes: nodes.map((n) => ({ id: n.id, type: n.data.kind, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, config: configToWire(n.data) })),
  edges: edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle ?? 'next', target: e.target })),
})

const str = (v: unknown) => (v == null ? '' : String(v))
const isKind = (v: unknown): v is Kind => typeof v === 'string' && v in defaults

// Server data is untrusted input: unknown step types are dropped, config is rebuilt from the known keys only,
// and edges that point at missing steps are discarded.
export function fromGraph(graph: GraphPayload | undefined): { nodes: StepNode[]; edges: StepEdge[] } {
  const nodes: StepNode[] = []
  for (const raw of graph?.nodes ?? []) {
    if (!isKind(raw?.type) || typeof raw.id !== 'string') continue
    const base = defaults[raw.type] as Record<string, unknown>
    const given = (raw.config ?? {}) as Record<string, unknown>
    const config: Record<string, unknown> = {}
    for (const key of Object.keys(base)) {
      config[key] = key === 'rules' ? (Array.isArray(given.rules) ? given.rules.map((r: Rule) => ({ field: str(r?.field), operator: str(r?.operator) || 'equals', value: str(r?.value) })) : base.rules) : str(given[key] ?? base[key])
    }
    nodes.push({ id: raw.id, type: 'step', position: { x: Number(raw.position?.x) || 0, y: Number(raw.position?.y) || 0 }, data: { kind: raw.type, config } as StepData })
  }
  const ids = new Set(nodes.map((n) => n.id))
  const edges = (graph?.edges ?? []).filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => makeEdge(e.source, e.sourceHandle || 'next', e.target))
  return { nodes, edges }
}

const GAP_X = 300
const GAP_Y = 180

/** Tidy top-to-bottom layout: a step sits one row below its deepest parent; true goes left of false. */
export function autoLayout(nodes: StepNode[], edges: StepEdge[]): StepNode[] {
  const depth = new Map(nodes.map((n) => [n.id, 0]))
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const e of edges) depth.set(e.target, Math.max(depth.get(e.target) ?? 0, (depth.get(e.source) ?? 0) + 1))
  }
  const x = new Map<string, number>()
  const out = new Map<string, { x: number; y: number }>()
  const rows = new Map<number, StepNode[]>()
  nodes.forEach((n) => rows.set(depth.get(n.id) ?? 0, [...(rows.get(depth.get(n.id) ?? 0) ?? []), n]))
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const key = (n: StepNode) => {
      const parents = edges.filter((e) => e.target === n.id)
      const xs = parents.map((e) => (x.get(e.source) ?? 0) + (e.sourceHandle === 'true' ? -10 : e.sourceHandle === 'false' ? 10 : 0))
      return xs.length ? Math.min(...xs) : 0
    }
    const ordered = [...rows.get(row)!].sort((a, b) => key(a) - key(b))
    ordered.forEach((n, i) => {
      const px = (i - (ordered.length - 1) / 2) * GAP_X
      x.set(n.id, px)
      out.set(n.id, { x: px, y: row * GAP_Y })
    })
  }
  return nodes.map((n) => ({ ...n, position: out.get(n.id) ?? n.position }))
}
