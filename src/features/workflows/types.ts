import type { GraphPayload } from './graph'

export type Workflow = {
  id: string
  name: string
  trigger: string
  graph: GraphPayload
  isActive: boolean
  runCount: number
  lastRunAt: string | null
  lastError: string | null
  /** The server pauses a workflow itself after this many failed runs in a row (10). */
  consecutiveFailures: number
  /** Only on scheduled and overdue workflows: who they run as, and when they fire. */
  runsAs?: RunsAs | null
  schedule?: { timezone: string; timezoneSource: 'workflow' | 'organization'; at: string; day: string | null } | null
  createdAt: string
}

type Person = { id: string; name: string }
/** problem: why the creator can't be used (gone or deactivated); willRunAs: who would run it right now. */
export type RunsAs = { problem: 'missing' | 'inactive' | null; creator: Person | null; willRunAs: Person | null }

export type WorkflowPayload = { name: string; trigger: string; isActive: boolean; graph: GraphPayload; runAsMe?: true }

export type FieldMeta = { key: string; label: string; type: 'text' | 'number' | 'enum' | 'user' | 'stage'; options?: string[] }
export type TriggerMeta = { event: string; label: string; fields: FieldMeta[]; timed?: true }

export type QueueStatus = { events: { pending: number; retrying: number; oldestSeconds: number }; delayed: { waiting: number; overdue: number } }

// Labels for the list and the canvas. The editor reads the full list (with each trigger's fields) from GET /workflows/meta;
// this copy only names events before that loads, so it must match the backend. A completed task is tasks.update + status = done.
export const triggers: { value: string; label: string }[] = [
  { value: 'leads.create', label: 'Lead created' },
  { value: 'leads.update', label: 'Lead updated' },
  { value: 'leads.convert', label: 'Lead converted' },
  { value: 'deals.create', label: 'Deal created' },
  { value: 'deals.update', label: 'Deal updated' },
  { value: 'deals.stage', label: 'Deal stage changed' },
  { value: 'contacts.create', label: 'Contact created' },
  { value: 'contacts.update', label: 'Contact updated' },
  { value: 'companies.create', label: 'Company created' },
  { value: 'companies.update', label: 'Company updated' },
  { value: 'tasks.create', label: 'Task created' },
  { value: 'tasks.update', label: 'Task updated (or completed)' },
  { value: 'tickets.create', label: 'Ticket created' },
  { value: 'tickets.update', label: 'Ticket updated' },
  { value: 'tickets.messages', label: 'Ticket reply' },
  { value: 'schedule.daily', label: 'Every day' },
  { value: 'schedule.weekly', label: 'Every week' },
  { value: 'tasks.overdue', label: 'Task became overdue' },
  { value: 'invoices.overdue', label: 'Invoice became overdue' },
]

export const triggerLabel = (value: string) => triggers.find((t) => t.value === value)?.label ?? value

// Fields an "Update record" step may set, per resource (the server rejects anything else when saving).
export const editableFields: Record<string, string[]> = {
  leads: ['status', 'priority', 'source', 'assignedTo', 'followUpDate', 'notes'],
  deals: ['ownerId', 'lostReason', 'expectedCloseDate'],
  contacts: ['jobTitle', 'phone', 'notes'],
  companies: ['industry', 'phone', 'website', 'notes'],
  tasks: ['priority', 'assignedTo', 'description'],
  tickets: ['priority', 'assignedTo'],
}
