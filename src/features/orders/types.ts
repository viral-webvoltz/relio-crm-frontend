export const orderStatuses = ['pending', 'confirmed', 'fulfilled', 'cancelled'] as const
export type OrderStatus = (typeof orderStatuses)[number]

export type Order = {
  id: string
  orderNumber: number
  status: OrderStatus
  customerName: string | null
  contactId: string | null
  companyId: string | null
  currency: string
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  discountType: 'percent' | 'fixed' | null
  discountValue: number | null
  taxRateBps: number
  notes: string | null
  createdAt: string
}

export type OrderItem = {
  id: string
  productId: string
  productName: string
  sku: string | null
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
}

export type OrderHistoryEntry = {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  note: string | null
  createdAt: string
  changedByName: string | null
}

export type OrderDetail = Order & { items: OrderItem[]; history: OrderHistoryEntry[] }

// The server enforces these; the UI mirrors them only to decide which buttons to show.
export const nextActions: Record<OrderStatus, { status: OrderStatus; label: string; tone: 'primary' | 'danger' }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirm order', tone: 'primary' },
    { status: 'cancelled', label: 'Cancel order', tone: 'danger' },
  ],
  confirmed: [
    { status: 'fulfilled', label: 'Mark fulfilled', tone: 'primary' },
    { status: 'cancelled', label: 'Cancel order', tone: 'danger' },
  ],
  fulfilled: [],
  cancelled: [],
}

export const statusTone = { pending: 'warning', confirmed: 'info', fulfilled: 'success', cancelled: 'neutral' } as const
