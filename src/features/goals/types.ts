// Mirrors backend/src/modules/goals. Money metrics are integer minor units (cents) with a currency; the others are plain counts.
export const metrics = [
  { key: 'revenue_won', label: 'Revenue from won deals', short: 'Revenue won', money: true },
  { key: 'deals_won', label: 'Deals won', short: 'Deals won', money: false },
  { key: 'orders_value', label: 'Order value', short: 'Order value', money: true },
  { key: 'leads_converted', label: 'Leads converted', short: 'Leads converted', money: false },
  { key: 'quotes_accepted', label: 'Quotes accepted', short: 'Quotes accepted', money: false },
  { key: 'tickets_resolved', label: 'Support tickets resolved', short: 'Tickets resolved', money: false },
] as const

export type Metric = (typeof metrics)[number]['key']
export const metricInfo = (key: string) => metrics.find((m) => m.key === key)
export const isMoneyMetric = (key: string) => metricInfo(key)?.money ?? false

export const periodTypes = [
  { key: 'month', label: 'A month' },
  { key: 'quarter', label: 'A quarter' },
  { key: 'year', label: 'A year' },
  { key: 'custom', label: 'Custom dates' },
] as const
export type PeriodType = (typeof periodTypes)[number]['key']

export type ScopeType = 'organization' | 'team' | 'user'
export type GoalState = 'upcoming' | 'achieved' | 'ahead' | 'behind' | 'missed'

export type Progress = {
  actual: number
  target: number
  percent: number
  state: GoalState
  /** Where a straight line towards the target would be today. */
  expected: number
  remaining: number
}

export type Goal = {
  id: string
  name: string
  metric: Metric
  scopeType: ScopeType
  userId: string | null
  teamId: string | null
  periodType: PeriodType
  startDate: string
  endDate: string
  target: number
  currency: string | null
  createdAt: string
  updatedAt: string
  progress: Progress
}

export type GoalDetail = Goal & { contributors: { userId: string; name: string; value: number }[] }

export type LeaderboardEntry = { rank: number; userId: string; name: string; value: number }
export type Leaderboard = { metric: Metric; period: 'month' | 'quarter' | 'year'; startDate: string; endDate: string; currency: string | null; entries: LeaderboardEntry[] }

export type GoalScope = { type: 'organization' } | { type: 'team'; teamId: string } | { type: 'user'; userId: string }

export type CreateGoalPayload = {
  name: string
  metric: Metric
  scope: GoalScope
  period: PeriodType
  on?: string
  startDate?: string
  endDate?: string
  target: number
  currency?: string
}

export type GoalWhen = 'current' | 'past' | 'all'
