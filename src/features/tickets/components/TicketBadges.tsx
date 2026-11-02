import { CircleCheck, CircleCheckBig, CirclePause, CircleX, Clock, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { priorityTone, statusLabel, statusTone, type SlaState, type Ticket } from '../types'
import { liveState, useNow } from './slaTime'

const sla: Record<SlaState, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; icon: LucideIcon; text: string }> = {
  ok: { label: 'on track', tone: 'success', icon: CircleCheck, text: 'text-success' },
  warning: { label: 'due soon', tone: 'warning', icon: Clock, text: 'text-warning' },
  breached: { label: 'overdue', tone: 'danger', icon: TriangleAlert, text: 'text-destructive' },
  paused: { label: 'paused', tone: 'neutral', icon: CirclePause, text: 'text-muted' },
  met: { label: 'met', tone: 'success', icon: CircleCheckBig, text: 'text-success' },
  missed: { label: 'missed', tone: 'danger', icon: CircleX, text: 'text-destructive' },
}

// Icon + words, never colour alone. `prefix` reads naturally in lists ("Reply overdue").
export function SlaBadge({ state, prefix }: { state: SlaState; prefix?: string }) {
  const { label, tone, icon: Icon, text } = sla[state]
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn('size-4 shrink-0', text)} aria-hidden />
      <Badge tone={tone}>{prefix ? `${prefix} ${label}` : label}</Badge>
    </span>
  )
}

type StatusBadgeTicket = Pick<Ticket, 'status' | 'isSlaBreached' | 'sla'>

export function TicketStatusBadge({ ticket }: { ticket: StatusBadgeTicket }) {
  const now = useNow()
  const resolution = ticket.sla?.resolution
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge tone={statusTone[ticket.status]}>{statusLabel[ticket.status]}</Badge>
      {resolution ? <SlaBadge state={liveState(resolution.state, resolution.dueAt, now)} prefix="Resolve" /> : ticket.isSlaBreached && <Badge tone="danger">SLA breached</Badge>}
    </span>
  )
}

export function TicketPriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>
}
