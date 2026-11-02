export type WebhookEndpoint = {
  id: string
  url: string
  /** Event names like "leads.create"; ["*"] means everything. */
  events: string[]
  isActive: boolean
  createdBy: string | null
  createdAt: string
}

/** Returned once, by POST /webhooks. The secret is never sent again. */
export type CreatedWebhook = WebhookEndpoint & { secret: string }

export type DeliveryStatus = 'queued' | 'sending' | 'delivered' | 'failed'

export type WebhookDelivery = {
  id: string
  event: string
  status: DeliveryStatus
  attempts: number
  responseStatus: number | null
  lastError: string | null
  nextAttemptAt: string | null
  createdAt: string
  deliveredAt: string | null
}

export const deliveryTone = { queued: 'neutral', sending: 'info', delivered: 'success', failed: 'danger' } as const

// Backend names events `<route>.<action>` (see audit-trail middleware); these are the common ones, offered as shortcuts.
export const suggestedEvents = ['leads.create', 'leads.update', 'contacts.create', 'companies.create', 'deals.create', 'deals.stage', 'orders.create', 'invoices.payments', 'tasks.create', 'tickets.create'] as const
