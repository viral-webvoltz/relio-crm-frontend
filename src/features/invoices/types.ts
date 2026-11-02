import { isBefore, parseISO, startOfToday } from 'date-fns'
import type { OrderItem } from '@/features/orders/types'

export const invoiceStatuses = ['unpaid', 'partial', 'paid', 'void'] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

export const paymentMethods = ['cash', 'card', 'bank_transfer', 'upi', 'other'] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export type Invoice = {
  id: string
  invoiceNumber: number
  orderId: string
  orderNumber: number
  status: InvoiceStatus
  customerName: string | null
  currency: string
  totalMinor: number
  paidMinor: number
  issueDate: string
  dueDate: string
  notes: string | null
}

export type Refund = { id: string; amountMinor: number; reason: string | null; createdAt: string }

export type Payment = {
  id: string
  amountMinor: number
  method: PaymentMethod
  reference: string | null
  paidAt: string
  recordedBy: string | null
  refunds: Refund[]
  refundedMinor: number
  refundableMinor: number
}

export type InvoiceDetail = Invoice & { outstandingMinor: number; items: OrderItem[]; payments: Payment[] }

export const formatInvoiceNumber = (n: number) => `INV-${String(n).padStart(4, '0')}`

export const methodLabel: Record<PaymentMethod, string> = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer', upi: 'UPI', other: 'Other' }

export const statusTone = { unpaid: 'warning', partial: 'info', paid: 'success', void: 'neutral' } as const

// Overdue is derived from the due date, never stored, so it can't go stale.
export const isOverdue = ({ status, dueDate }: Pick<Invoice, 'status' | 'dueDate'>) =>
  (status === 'unpaid' || status === 'partial') && isBefore(parseISO(dueDate), startOfToday())
