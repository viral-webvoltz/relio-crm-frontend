import { format } from 'date-fns'
import { z } from 'zod'
import { toMajor, toMinor } from '@/lib/money'
import { isMoneyMetric, type CreateGoalPayload, type GoalDetail, type Metric } from '../types'

const DATE = /^\d{4}-\d{2}-\d{2}$/
// Backend caps a goal at 1e13 minor units; in major units that is 1e11 for money and 1e13 for counts.
const MAX_MONEY = 100_000_000_000
const MAX_COUNT = 10_000_000_000_000

export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the goal a name').max(120, 'Keep the name under 120 characters'),
    metric: z.string().min(1, 'Choose what to measure'),
    scopeType: z.enum(['organization', 'team', 'user']),
    userId: z.string(),
    teamId: z.string(),
    period: z.enum(['month', 'quarter', 'year', 'custom']),
    on: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    currency: z.string(),
    target: z.string().trim().min(1, 'Enter a target'),
  })
  .superRefine((g, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    const money = isMoneyMetric(g.metric)
    if (g.scopeType === 'user' && !g.userId) issue('userId', 'Choose a person')
    if (g.scopeType === 'team' && !g.teamId) issue('teamId', 'Choose a team')
    if (g.period === 'custom') {
      if (!DATE.test(g.startDate)) issue('startDate', 'Pick a start date')
      if (!DATE.test(g.endDate)) issue('endDate', 'Pick an end date')
      else if (DATE.test(g.startDate) && g.endDate < g.startDate) issue('endDate', 'The end date is before the start date')
    } else if (!DATE.test(g.on)) issue('on', 'Pick a day inside the period')
    if (money && !/^[A-Za-z]{3}$/.test(g.currency.trim())) issue('currency', 'Enter a 3-letter currency code, like USD')
    const n = Number(g.target)
    if (money ? !/^\d+(\.\d{1,2})?$/.test(g.target) || !(n > 0) || n > MAX_MONEY : !/^\d+$/.test(g.target) || !(n > 0) || n > MAX_COUNT) {
      issue('target', money ? 'Enter an amount above zero, with at most 2 decimals' : 'Enter a whole number above zero')
    }
  })

export type GoalFormValues = z.infer<typeof goalFormSchema>

export const emptyGoal = (): GoalFormValues => ({
  name: '',
  metric: 'revenue_won',
  scopeType: 'organization',
  userId: '',
  teamId: '',
  period: 'month',
  on: format(new Date(), 'yyyy-MM-dd'),
  startDate: '',
  endDate: '',
  currency: '',
  target: '',
})

export const toFormValues = (goal: GoalDetail): GoalFormValues => ({
  ...emptyGoal(),
  name: goal.name,
  metric: goal.metric,
  scopeType: goal.scopeType,
  userId: goal.userId ?? '',
  teamId: goal.teamId ?? '',
  period: goal.periodType,
  startDate: goal.startDate,
  endDate: goal.endDate,
  currency: goal.currency ?? '',
  target: isMoneyMetric(goal.metric) ? toMajor(goal.target) : String(goal.target),
})

export const targetToWire = (metric: string, target: string) => (isMoneyMetric(metric) ? toMinor(target) : Number(target))

export function toCreatePayload(v: GoalFormValues): CreateGoalPayload {
  const money = isMoneyMetric(v.metric)
  return {
    name: v.name.trim(),
    metric: v.metric as Metric,
    scope: v.scopeType === 'user' ? { type: 'user', userId: v.userId } : v.scopeType === 'team' ? { type: 'team', teamId: v.teamId } : { type: 'organization' },
    period: v.period,
    ...(v.period === 'custom' ? { startDate: v.startDate, endDate: v.endDate } : { on: v.on }),
    target: targetToWire(v.metric, v.target),
    ...(money && { currency: v.currency.trim().toUpperCase() }),
  }
}
