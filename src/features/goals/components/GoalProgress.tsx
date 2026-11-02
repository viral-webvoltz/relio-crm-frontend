import { CalendarClock, CheckCircle2, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatAmount, stateText } from '../format'
import type { Goal, GoalState } from '../types'

const icons = { achieved: CheckCircle2, ahead: TrendingUp, behind: TrendingDown, missed: XCircle, upcoming: CalendarClock } as const
const tones = { achieved: 'success', ahead: 'success', behind: 'warning', missed: 'danger', upcoming: 'neutral' } as const
const bars: Record<GoalState, string> = { achieved: 'bg-success', ahead: 'bg-primary', behind: 'bg-warning', missed: 'bg-destructive', upcoming: 'bg-muted' }

// Status is always an icon AND words, never colour alone.
export function GoalStateBadge({ state }: { state: GoalState }) {
  const Icon = icons[state]
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0" aria-hidden />
      <Badge tone={tones[state]}>{stateText[state]}</Badge>
    </span>
  )
}

/** "62% · $31,000 of $50,000" - the same words the bar announces to a screen reader. */
export const progressText = (goal: Goal) =>
  `${goal.progress.percent}% · ${formatAmount(goal.metric, goal.progress.actual, goal.currency)} of ${formatAmount(goal.metric, goal.progress.target, goal.currency)}`

export function GoalProgress({ goal }: { goal: Goal }) {
  const { percent, state, expected, target } = goal.progress
  const fill = Math.max(0, Math.min(100, percent))
  const pace = target > 0 ? Math.min(100, Math.round((expected / target) * 100)) : 0
  return (
    <div>
      <div
        role="progressbar"
        aria-label={`Progress towards ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill}
        aria-valuetext={progressText(goal)}
        className="relative h-3 overflow-hidden rounded-full bg-border/60"
      >
        <div className={cn('h-full rounded-full transition-[width]', bars[state])} style={{ width: `${fill}%` }} />
        {state === 'ahead' || state === 'behind' ? <span aria-hidden title="Where you should be by today" className="absolute inset-y-0 w-0.5 bg-heading/70" style={{ left: `${pace}%` }} /> : null}
      </div>
      <p className="mt-1.5 text-sm font-medium text-heading">{progressText(goal)}</p>
    </div>
  )
}
