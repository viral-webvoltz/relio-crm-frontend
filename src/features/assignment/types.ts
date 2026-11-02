import type { Operator } from '@/features/workflows/graph'

export type Resource = 'leads' | 'tickets'
export type Strategy = 'round_robin' | 'least_loaded'

export type RuleCondition = { field: string; operator: Operator; value?: string }
export type RuleTarget = { type: 'user'; userId: string } | { type: 'team'; teamId: string; strategy: Strategy }

export type Rule = {
  id: string
  resource: Resource
  name: string
  /** Evaluation order within a resource: the first active rule that matches decides. */
  position: number
  isActive: boolean
  conditions: { mode: 'all' | 'any'; rules: RuleCondition[] }
  target: RuleTarget
  lastUserId: string | null
  createdAt: string
  updatedAt: string
}

export type RulePayload = { resource: Resource; name: string; isActive: boolean; conditions: Rule['conditions']; target: RuleTarget }
export type RuleChanges = Partial<Omit<RulePayload, 'resource'>>

export type TestResult = { match: { userId: string; ruleId: string; ruleName: string } | null }
export type ApplyResult = { checked: number; assigned: number; unassigned: number }

export const strategyLabel: Record<Strategy, string> = {
  round_robin: 'In turn (everyone gets one before anyone gets a second)',
  least_loaded: 'Whoever has the fewest open ones',
}
