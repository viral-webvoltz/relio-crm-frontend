export const ticketStatuses = ['open', 'pending', 'resolved', 'closed'] as const
export type TicketStatus = (typeof ticketStatuses)[number]

export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const
export type TicketPriority = (typeof ticketPriorities)[number]

export type Ticket = {
  id: string
  ticketNumber: number
  subject: string
  status: TicketStatus
  priority: TicketPriority
  contactId: string | null
  customerName: string | null
  source: 'staff' | 'portal'
  assignedTo: string | null
  assigneeName: string | null
  slaDueAt: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  isSlaBreached: boolean
  /** Per-clock status computed by the server (see SlaState). */
  sla?: TicketSla
}

// ok = on track · warning = due soon · breached = overdue · paused = waiting on the customer · met / missed = finished on time / late
export type SlaState = 'ok' | 'warning' | 'breached' | 'paused' | 'met' | 'missed'
export type SlaClock = { dueAt: string; state: SlaState }
export type TicketSla = {
  resolution: SlaClock & { resolvedAt: string | null }
  /** null for tickets that predate first-reply tracking, or were finished without a reply. */
  firstResponse: (SlaClock & { respondedAt: string | null }) | null
}

export type TicketMessage = {
  id: string
  authorType: 'staff' | 'customer'
  authorName: string | null
  body: string
  isInternal: boolean
  createdAt: string
}

export type TicketDetail = Ticket & { messages: TicketMessage[] }

export const statusLabel: Record<TicketStatus, string> = { open: 'open', pending: 'waiting on customer', resolved: 'resolved', closed: 'closed' }
export const statusTone = { open: 'info', pending: 'warning', resolved: 'success', closed: 'neutral' } as const
export const priorityTone = { low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger' } as const

export const formatTicketNumber = (n: number) => `#${n}`

export type SlaTarget = { firstResponseMinutes: number; resolutionMinutes: number }
export type SlaBusinessHours = { timezone: string; days: number[]; start: string; end: string }
export type SlaPolicy = {
  targets: Record<TicketPriority, SlaTarget>
  /** null means the clock runs around the clock. */
  businessHours: SlaBusinessHours | null
  warnAtPercent: number
  isDefault: boolean
  /** Only on the response to a save: how many open tickets had their deadlines moved. */
  ticketsMoved?: number
}
export type SlaPolicyPayload = Omit<SlaPolicy, 'isDefault' | 'ticketsMoved'> & { applyToOpen: boolean }

export type SlaSummary = {
  days: number
  tickets: number
  resolved: number
  resolutionRate: number | null
  firstReplyRate: number | null
  now: { breached: number; atRisk: number; firstResponseBreached: number }
  byPriority: { priority: TicketPriority; tickets: number; resolutionRate: number | null; firstReplyRate: number | null; avgFirstResponseMinutes: number | null }[]
}
