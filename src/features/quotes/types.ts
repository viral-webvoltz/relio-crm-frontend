// "expired" is not stored by the server: it is a sent quote past its valid-until date (and a status you can filter by).
export const quoteStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const
export type QuoteStatus = (typeof quoteStatuses)[number]

export const quoteStatusLabel: Record<QuoteStatus, string> = { draft: 'draft', sent: 'sent', accepted: 'accepted', rejected: 'declined', expired: 'expired' }
export const quoteStatusTone = { draft: 'neutral', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning' } as const

export type Quote = {
  id: string
  quoteNumber: number
  status: QuoteStatus
  contactId: string | null
  companyId: string | null
  dealId: string | null
  customerName: string | null
  currency: string
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  discountType: 'percent' | 'fixed' | null
  /** Basis points for "percent" (1% = 100), minor units for "fixed". */
  discountValue: number | null
  taxRateBps: number
  validUntil: string | null
  notes: string | null
  terms: string | null
  sentAt: string | null
  respondedAt: string | null
  respondedByName: string | null
  responseNote: string | null
  convertedOrderId: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export type QuoteItem = {
  id: string
  productId: string
  productName: string
  sku: string | null
  description: string | null
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
}

export type QuoteDetail = Quote & { items: QuoteItem[]; orderNumber: number | null }

/** POST /quotes/:id/send. The link exists only in this response (the server keeps just its hash). */
export type SendResult = { quote: Quote; link: string; emailQueued: boolean }

/** POST /quotes/:id/convert. */
export type ConvertResult = { quote: Quote; order: { id: string; orderNumber: number }; invoice: { id: string; invoiceNumber: number } | null }

/** What the customer link shows: no internal ids, nothing about staff. */
export type PublicQuote = {
  quoteNumber: number
  status: QuoteStatus
  canRespond: boolean
  organizationName: string
  customerName: string | null
  currency: string
  validUntil: string | null
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  taxRateBps: number
  totalMinor: number
  notes: string | null
  terms: string | null
  respondedAt: string | null
  respondedByName: string | null
  items: { name: string; description: string | null; quantity: number; unitPriceMinor: number; lineTotalMinor: number }[]
}

// Mirrors the server's rules only to decide which buttons to show; the server still enforces them (409 QUOTE_LOCKED etc.).
export const canEdit = (status: QuoteStatus) => status === 'draft' || status === 'sent'
export const canSend = (status: QuoteStatus) => status === 'draft' || status === 'sent'
export const canDelete = (status: QuoteStatus) => status === 'draft' || status === 'rejected'
