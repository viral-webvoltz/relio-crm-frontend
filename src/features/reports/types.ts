export type ReportType = 'revenue-by-month' | 'pipeline-velocity' | 'leads-funnel'

export type ReportRange = { from?: string; to?: string }

// Same permission keys the backend authorizes each report with (reports.service REPORT_PERMISSIONS).
export const reportMeta: Record<ReportType, { label: string; blurb: string; permission: string }> = {
  'revenue-by-month': { label: 'Revenue by month', blurb: 'What you invoiced and collected each month.', permission: 'invoices.view' },
  'pipeline-velocity': { label: 'Sales pipeline', blurb: 'Where your deals are now, and how many you win.', permission: 'deals.view' },
  'leads-funnel': { label: 'Leads funnel', blurb: 'Where your leads come from and how many convert.', permission: 'leads.view' },
}
export const reportTypes = Object.keys(reportMeta) as ReportType[]

export type MonthlyRow = { month: string; currency: string | null; invoicedMinor: number; collectedMinor: number; orderCount: number; orderTotalMinor: number }
export type RevenueReport = { range: { from: string; to: string }; rows: MonthlyRow[] }

export type PipelineReport = {
  range: { from: string; to: string }
  stages: { stageId: string; stage: string; pipelineId: string; kind: string; position: number; currency: string | null; dealCount: number; valueMinor: number; avgAgeDays: number | null }[]
  summary: { won: number; lost: number; winRate: number | null; avgDaysToWon: number | null }
  wonByCurrency: { currency: string; count: number; valueMinor: number; avgValueMinor: number }[]
  notes: string[]
}

export type LeadsReport = {
  range: { from: string; to: string }
  total: number
  converted: number
  conversionRate: number | null
  byStatus: { status: string; count: number }[]
  bySource: { source: string; count: number }[]
}

export type ReportOutput =
  | { type: 'revenue-by-month'; data: RevenueReport }
  | { type: 'pipeline-velocity'; data: PipelineReport }
  | { type: 'leads-funnel'; data: LeadsReport }

export type SavedReport = { id: string; name: string; reportType: ReportType; params: ReportRange; createdAt: string; updatedAt: string }

export type Frequency = 'daily' | 'weekly' | 'monthly'
export type Schedule = {
  id: string
  savedReportId: string
  frequency: Frequency
  hourUtc: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  recipients: string[]
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string
  createdAt: string
}

export type SchedulePayload = {
  savedReportId: string
  frequency: Frequency
  hourUtc: number
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  recipients: string[]
  isActive: boolean
}
