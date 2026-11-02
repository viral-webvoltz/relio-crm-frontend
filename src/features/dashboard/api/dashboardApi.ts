import { httpClient } from '@/lib/httpClient'

// A section is null when the user lacks permission to view it.
// Range-based numbers carry the same-length window right before, so the UI can show change.
export type Compared<T = number> = { value: T; previous: T }
export type DashboardRange = { from?: string; to?: string }

export type DashboardSummary = {
  range: { from: string; to: string; previousFrom: string; previousTo: string }
  contacts: number | null
  companies: number | null
  leads: {
    total: Compared
    converted: Compared
    conversionRate: Compared
    bySource: { source: string; count: number }[]
    recent: { id: string; firstName: string; lastName: string | null; status: string; source: string; createdAt: string }[]
  } | null
  deals: {
    openCount: number
    openValueMinor: number
    wonCount: Compared
    wonValueMinor: Compared
    byStage: { stageId: string; stage: string; kind: string; count: number; valueMinor: number }[]
  } | null
  invoices: { collectedMinor: Compared; outstandingMinor: number; overdueMinor: number; overdueCount: number } | null
  orders: {
    created: Compared
    totalMinor: Compared
    recent: { id: string; orderNumber: number; customerName: string | null; status: string; totalMinor: number; currency: string; createdAt: string }[]
  } | null
  tasks: {
    open: number
    overdue: number
    upcoming: { id: string; title: string; dueDate: string | null; priority: string }[]
  } | null
}

export async function getDashboardSummary(range: DashboardRange, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: DashboardSummary }>('/dashboard/summary', { params: range, signal })
  return data.data
}
