// The server stores four statuses; "completed" means the end date or invoice limit was reached.
export const subscriptionStatuses = ['active', 'paused', 'cancelled', 'completed'] as const
export type SubscriptionStatus = (typeof subscriptionStatuses)[number]

export const statusLabel: Record<SubscriptionStatus, string> = { active: 'active', paused: 'paused', cancelled: 'cancelled', completed: 'completed' }
export const statusTone = { active: 'success', paused: 'warning', cancelled: 'neutral', completed: 'info' } as const

export const intervalUnits = ['week', 'month', 'year'] as const
export type IntervalUnit = (typeof intervalUnits)[number]

export type Subscription = {
  id: string
  name: string
  status: SubscriptionStatus
  contactId: string | null
  companyId: string | null
  customerName: string | null
  currency: string
  discountType: 'percent' | 'fixed' | null
  /** Basis points for "percent" (1% = 100), minor units for "fixed". */
  discountValue: number | null
  taxRateBps: number
  intervalUnit: IntervalUnit
  intervalCount: number
  startOn: string
  endOn: string | null
  maxRuns: number | null
  /** Billing dates passed so far, billed or skipped while paused. */
  cycle: number
  /** Invoices created so far. */
  runCount: number
  /** Null once the subscription is finished. */
  nextRunOn: string | null
  dueDays: number
  autoSend: boolean
  notes: string | null
  /** Consecutive failed attempts; at three the server pauses the subscription. */
  failureCount: number
  lastError: string | null
  lastAttemptAt: string | null
  createdAt: string
  updatedAt: string
}

export type SubscriptionItem = { id: string; productId: string; productName: string; quantity: number; unitPriceMinor: number }
export type PerRun = { subtotalMinor: number; discountMinor: number; taxMinor: number; totalMinor: number }

export type SubscriptionDetail = Subscription & {
  items: SubscriptionItem[]
  /** What each invoice will total. */
  perRun: PerRun
  /** The next few billing dates (active subscriptions only). */
  upcoming: string[]
}

export type RunStatus = 'invoiced' | 'failed'
export type SubscriptionRun = { id: string; scheduledFor: string; status: RunStatus; orderId: string | null; invoiceId: string | null; error: string | null; createdAt: string }

/** POST /subscriptions/:id/run. Order and invoice objects are the ones the orders and invoices modules return. */
export type RunNowResult = { subscription: Subscription; order: { id: string; orderNumber?: number }; invoice: { id: string; invoiceNumber?: number; totalMinor?: number } }

export const MAX_FAILURES = 3

// Mirrors the server's rules only to decide which buttons to show; the server still enforces them (409 SUBSCRIPTION_LOCKED etc.).
export const canEdit = (status: SubscriptionStatus) => status === 'active' || status === 'paused'
export const canPause = (status: SubscriptionStatus) => status === 'active'
export const canResume = (status: SubscriptionStatus) => status === 'paused'
export const canCancel = (status: SubscriptionStatus) => status === 'active' || status === 'paused'
export const canRunNow = (status: SubscriptionStatus) => status === 'active'
/** A subscription that already billed keeps its history: cancel it instead of deleting. */
export const canDelete = (s: Pick<Subscription, 'runCount'>) => s.runCount === 0

const unitWord = { week: 'week', month: 'month', year: 'year' } as const
/** "every month", "every 2 weeks". */
export const everyText = (unit: IntervalUnit, count: number) => (count === 1 ? `every ${unitWord[unit]}` : `every ${count} ${unitWord[unit]}s`)

/** True when billing keeps failing and the server paused it for that reason. */
export const pausedByFailures = (s: Pick<Subscription, 'status' | 'failureCount'>) => s.status === 'paused' && s.failureCount >= MAX_FAILURES
