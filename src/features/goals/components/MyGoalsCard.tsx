import { Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useCan } from '@/features/auth/hooks/useCan'
import { periodText, timeLeft } from '../format'
import { useGoals } from '../hooks/useGoals'
import { GoalProgress, GoalStateBadge } from './GoalProgress'

const SHOWN = 3

// Dashboard card: the signed-in person's own current goals. Shows nothing at all without permission or without goals.
// Goals set for a team or the whole organisation are on the Goals page (the API can only filter by person).
export function MyGoalsCard() {
  const canView = useCan('goals.view')
  const me = useCurrentUser().data
  const goals = useGoals({ when: 'current', userId: me?.id }, canView && Boolean(me?.id))

  if (!canView || !goals.data || goals.data.length === 0) return null
  const shown = goals.data.slice(0, SHOWN)
  return (
    <section className="card p-6" aria-labelledby="my-goals">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="my-goals" className="flex items-center gap-2 text-base font-semibold text-heading">
          <Target className="size-5 text-primary" aria-hidden /> My goals
        </h2>
        <Link to="/goals" className="link-action">See all goals</Link>
      </div>
      <ul className="space-y-5">
        {shown.map((goal) => (
          <li key={goal.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-heading">{goal.name}</p>
              <GoalStateBadge state={goal.progress.state} />
            </div>
            <GoalProgress goal={goal} />
            <p className="mt-1 text-xs text-muted">{periodText(goal)} · {timeLeft(goal)}</p>
          </li>
        ))}
      </ul>
      {goals.data.length > SHOWN && <p className="mt-4 text-sm text-muted">and {goals.data.length - SHOWN} more on the Goals page.</p>}
    </section>
  )
}
