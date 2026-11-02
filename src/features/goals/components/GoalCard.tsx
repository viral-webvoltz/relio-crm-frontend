import { Building2, User, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatAmount, paceNote, periodText, timeLeft } from '../format'
import { metricInfo, type Goal } from '../types'
import { GoalProgress, GoalStateBadge } from './GoalProgress'

type Props = { goal: Goal; owner: string; canManage: boolean; onDelete: (goal: Goal) => void }

export function GoalCard({ goal, owner, canManage, onDelete }: Props) {
  const Scope = goal.scopeType === 'user' ? User : goal.scopeType === 'team' ? Users : Building2
  return (
    <li className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-heading">{goal.name}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {metricInfo(goal.metric)?.label} · {periodText(goal)}
          </p>
        </div>
        <GoalStateBadge state={goal.progress.state} />
      </div>

      <GoalProgress goal={goal} />

      <p className="text-sm text-body">{paceNote(goal)}</p>

      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">For</dt>
          <Scope className="size-4" aria-hidden />
          <dd>{owner}</dd>
        </div>
        <div>
          <dt className="sr-only">Time</dt>
          <dd>{timeLeft(goal)}</dd>
        </div>
        <div>
          <dt className="sr-only">Target</dt>
          <dd>Target {formatAmount(goal.metric, goal.target, goal.currency)}</dd>
        </div>
      </dl>

      {canManage && (
        <div className="flex gap-4 border-t border-border/60 pt-3">
          <Link to={`/goals/${goal.id}/edit`} className="link-action">Edit</Link>
          <button type="button" className="link-danger" onClick={() => onDelete(goal)}>Delete</button>
        </div>
      )}
    </li>
  )
}
