import type { InvoiceStatus, PaymentMethod } from '@/features/invoices/types'
import type { OrderStatus } from '@/features/orders/types'

// What the customer portal API returns: deliberately narrower than the staff API (no notes, staff names or references).
export type PortalMe = { name: string; email: string; organizationName: string; mustChangePassword?: boolean }

export type PortalLine = { id: string; productName: string; unitPriceMinor: number; quantity: number; lineTotalMinor: number }

export type PortalOrder = {
  id: string
  orderNumber: number
  status: OrderStatus
  currency: string
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  createdAt: string
}

export type PortalOrderDetail = PortalOrder & { items: PortalLine[]; history: { id: string; toStatus: OrderStatus; createdAt: string }[] }

export type PortalInvoice = {
  id: string
  invoiceNumber: number
  orderId: string
  orderNumber: number
  status: InvoiceStatus
  currency: string
  totalMinor: number
  paidMinor: number
  issueDate: string
  dueDate: string
}

export type PortalPayment = { id: string; amountMinor: number; method: PaymentMethod; paidAt: string; refundedMinor: number }

export type PortalInvoiceDetail = PortalInvoice & { outstandingMinor: number; items: PortalLine[]; payments: PortalPayment[] }
