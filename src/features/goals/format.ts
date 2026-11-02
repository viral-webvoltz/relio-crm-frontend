import { differenceInCalendarDays, format, parseISO, startOfToday } from 'date-fns'
import { formatMoney } from '@/lib/money'
import { isMoneyMetric, type Goal, type GoalState } from './types'

/** A money value in the goal's currency, or a plain count. */
export function formatAmount(metric: string, value: number, currency: string | null) {
  return isMoneyMetric(metric) && currency ? formatMoney(value, currency) : value.toLocaleString()
}

/** "March 2026", "Q1 2026", "2026" or "1 Mar – 15 Apr 2026". */
export function periodText(goal: Pick<Goal, 'periodType' | 'startDate' | 'endDate'>) {
  const start = parseISO(goal.startDate)
  const end = parseISO(goal.endDate)
  if (goal.periodType === 'month') return format(start, 'MMMM yyyy')
  if (goal.periodType === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1} ${format(start, 'yyyy')}`
  if (goal.periodType === 'year') return format(start, 'yyyy')
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** How long until the period starts, how long is left, or how long ago it ended. */
export function timeLeft(goal: Pick<Goal, 'startDate' | 'endDate'>) {
  const today = startOfToday()
  const toStart = differenceInCalendarDays(parseISO(goal.startDate), today)
  if (toStart > 0) return `Starts in ${plural(toStart, 'day')}`
  const toEnd = differenceInCalendarDays(parseISO(goal.endDate), today)
  if (toEnd < 0) return `Ended ${plural(-toEnd, 'day')} ago`
  if (toEnd === 0) return 'Ends today'
  return `${plural(toEnd, 'day')} left`
}

export const stateText: Record<GoalState, string> = {
  achieved: 'Achieved',
  ahead: 'Ahead of pace',
  behind: 'Behind pace',
  missed: 'Missed',
  upcoming: 'Not started',
}

/** Plain explanation for the line under the bar, so nobody has to guess what "pace" means. */
export function paceNote(goal: Goal) {
  const { state, expected, remaining } = goal.progress
  const money = (v: number) => formatAmount(goal.metric, v, goal.currency)
  if (state === 'achieved') return 'Target reached.'
  if (state === 'missed') return `${money(remaining)} short of the target.`
  if (state === 'upcoming') return 'The period has not started yet.'
  return `Roughly ${money(expected)} is needed by today to stay on track. ${money(remaining)} to go.`
}
