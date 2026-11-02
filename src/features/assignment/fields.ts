import { operators } from '@/features/workflows/graph'
import { useWorkflowMeta } from '@/features/workflows/hooks/useWorkflows'
import type { FieldMeta } from '@/features/workflows/types'
import type { Resource } from './types'

export const resources: { key: Resource; label: string; noun: readonly [string, string]; event: string }[] = [
  { key: 'leads', label: 'Leads', noun: ['lead', 'leads'], event: 'leads.create' },
  { key: 'tickets', label: 'Tickets', noun: ['ticket', 'tickets'], event: 'tickets.create' },
]

// "was changed in this update" means nothing when a record is first created, so the server does not accept it here.
export const ruleOperators = operators.filter((o) => o.value !== 'changed')

const priorities = ['low', 'medium', 'high']

// Used until /workflows/meta answers (or when the signed-in role may not read it). Same fields and choices the server lists there.
const fallback: Record<Resource, FieldMeta[]> = {
  leads: [
    { key: 'firstName', label: 'First name', type: 'text' },
    { key: 'lastName', label: 'Last name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'companyName', label: 'Company', type: 'text' },
    { key: 'source', label: 'Source', type: 'enum', options: ['website', 'referral', 'social', 'email', 'event', 'other'] },
    { key: 'status', label: 'Status', type: 'enum', options: ['new', 'contacted', 'qualified', 'unqualified', 'converted'] },
    { key: 'priority', label: 'Priority', type: 'enum', options: priorities },
    { key: 'score', label: 'Score', type: 'number' },
  ],
  tickets: [
    { key: 'subject', label: 'Subject', type: 'text' },
    { key: 'status', label: 'Status', type: 'enum', options: ['open', 'pending', 'resolved', 'closed'] },
    { key: 'priority', label: 'Priority', type: 'enum', options: [...priorities, 'urgent'] },
  ],
}

// A record being routed has no owner yet, so "assigned to" is not a useful thing to test.
export function useRecordFields(resource: Resource): FieldMeta[] {
  const meta = useWorkflowMeta()
  const event = resources.find((r) => r.key === resource)!.event
  const fields = meta.data?.find((t) => t.event === event)?.fields ?? fallback[resource]
  return fields.filter((f) => f.key !== 'assignedTo')
}
