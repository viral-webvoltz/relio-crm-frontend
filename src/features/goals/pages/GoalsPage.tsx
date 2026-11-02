import { Plus, Target } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useCan } from '@/features/auth/hooks/useCan'
import { cn } from '@/lib/utils'
import { GoalCard } from '../components/GoalCard'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { useDeleteGoal, useGoals, useLeaderboard, useOwnerNames } from '../hooks/useGoals'
import { isMoneyMetric, metrics, type Goal, type GoalWhen, type Metric } from '../types'

const TABS = [
  { key: 'goals', label: 'Goals' },
  { key: 'leaderboard', label: 'Leaderboard' },
] as const
const WHEN: { key: GoalWhen; label: string }[] = [
  { key: 'current', label: 'Current and upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]
const PERIODS = [
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
] as const
const CURRENCY = /^[A-Za-z]{3}$/

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  )
}

function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const me = useCurrentUser().data
  const metric = (metrics.find((m) => m.key === params.get('lm'))?.key ?? 'revenue_won') as Metric
  const period = (PERIODS.find((p) => p.key === params.get('lp'))?.key ?? 'month') as 'month' | 'quarter' | 'year'
  // Money results need a currency. Suggest the one your goals already use rather than guessing.
  const known = useGoals({ when: 'all' }).data?.find((g) => g.currency)?.currency ?? ''
  const [typed, setTyped] = useState(params.get('cur') ?? '')
  const currency = (typed || known).toUpperCase()
  const money = isMoneyMetric(metric)
  const ready = !money || CURRENCY.test(currency)
  const board = useLeaderboard({ metric, period, currency: money ? currency : undefined }, ready)

  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Labelled label="Measure">
          <Select aria-label="Measure" value={metric} onChange={(e) => set('lm', e.target.value)} className="w-auto">
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </Labelled>
        <Labelled label="Period">
          <Select aria-label="Period" value={period} onChange={(e) => set('lp', e.target.value)} className="w-auto">
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        </Labelled>
        {money && (
          <Labelled label="Currency">
            <input
              aria-label="Currency, 3 letters"
              className="input-base w-24 uppercase"
              maxLength={3}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="USD"
              value={typed || known}
              aria-invalid={Boolean(typed) && !CURRENCY.test(typed) ? true : undefined}
              onChange={(e) => {
                setTyped(e.target.value)
                if (CURRENCY.test(e.target.value)) set('cur', e.target.value.toUpperCase())
              }}
            />
          </Labelled>
        )}
      </div>
      {!ready ? (
        <div className="card p-6 text-sm text-muted">Enter a 3-letter currency code, like USD, to rank money results.</div>
      ) : (
        <LeaderboardTable data={board.data} loading={board.isPending} error={board.isError ? board.error : null} onRetry={() => board.refetch()} meId={me?.id} />
      )}
    </>
  )
}

export function GoalsPage() {
  const [params, setParams] = useSearchParams()
  const me = useCurrentUser().data
  const canManage = useCan('goals.manage')
  const names = useOwnerNames()
  const remove = useDeleteGoal()

  const tab = params.get('tab') === 'leaderboard' ? 'leaderboard' : 'goals'
  const when = (WHEN.find((w) => w.key === params.get('when'))?.key ?? 'current') as GoalWhen
  const scope = params.get('scope') ?? ''
  const metric = (metrics.find((m) => m.key === params.get('metric'))?.key ?? '') as Metric | ''

  // The API filters by one person only; organisation and team goals are narrowed here (the list is capped at 200).
  const serverUser = scope === 'me' ? me?.id : scope.startsWith('u:') ? scope.slice(2) : undefined
  const waitingForMe = scope === 'me' && !me
  const goals = useGoals({ when, metric: metric || undefined, userId: serverUser }, tab === 'goals' && !waitingForMe)
  const visible = (goals.data ?? []).filter((g) => (scope === 'org' ? g.scopeType === 'organization' : scope === 'teams' ? g.scopeType === 'team' : true))
  const filtered = Boolean(scope || metric || when !== 'current')

  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  const ownerOf = (g: Goal) => (g.scopeType === 'organization' ? 'Whole organisation' : g.scopeType === 'team' ? names.teamName(g.teamId) : g.userId === me?.id ? 'You' : names.userName(g.userId))

  const handleDelete = async (goal: Goal) => {
    if (!(await confirmDialog(`Delete the goal “${goal.name}”? Progress is counted from your live data, so no deals, orders or tickets are touched.`, { title: 'Delete goal?', confirmLabel: 'Delete goal' }))) return
    remove.mutate(goal.id, { onSuccess: () => toast.success('Goal deleted'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Targets for you, your team or the whole business, tracked automatically from your real data."
        actions={canManage && <Link to="/goals/new" className="btn-primary"><Plus className="size-4" aria-hidden /> New goal</Link>}
      />

      <div role="tablist" aria-label="Goals sections" className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => set('tab', t.key === 'goals' ? '' : t.key)}
            className={cn('min-h-11 border-b-2 px-4 text-sm font-medium', tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-heading')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        <Leaderboard />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Labelled label="When">
              <Select aria-label="Show goals" value={when} onChange={(e) => set('when', e.target.value === 'current' ? '' : e.target.value)} className="w-auto">
                {WHEN.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              </Select>
            </Labelled>
            <Labelled label="For">
              <Select aria-label="Whose goals" value={scope} onChange={(e) => set('scope', e.target.value)} className="w-auto">
                <option value="">Everyone’s goals</option>
                <option value="me">My goals</option>
                <option value="org">Whole organisation</option>
                <option value="teams">Teams</option>
                {names.people.filter((p) => p.id !== me?.id).map((p) => <option key={p.id} value={`u:${p.id}`}>{p.fullName}</option>)}
              </Select>
            </Labelled>
            <Labelled label="Measure">
              <Select aria-label="Measure" value={metric} onChange={(e) => set('metric', e.target.value)} className="w-auto">
                <option value="">Any measure</option>
                {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </Select>
            </Labelled>
          </div>

          {scope === 'me' || scope.startsWith('u:') ? (
            <p className="mb-4 text-sm text-muted">This shows goals set for that person. Team and organisation goals they contribute to are under “Teams” and “Whole organisation”.</p>
          ) : null}

          {goals.isPending && !waitingForMe ? (
            <TableSkeleton rows={3} />
          ) : goals.isError ? (
            <div className="card"><ErrorState message={goals.error.message} onRetry={() => goals.refetch()} /></div>
          ) : visible.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Target}
                title={filtered ? 'No goals match these filters' : 'No goals yet'}
                hint={
                  filtered
                    ? 'Try another period, person or measure.'
                    : 'A goal is a target for a number that matters, like revenue from won deals this quarter. Progress updates by itself from your deals, orders and tickets.'
                }
              />
              {canManage && !filtered && (
                <p className="pb-6 text-center">
                  <Link to="/goals/new" className="btn-primary"><Plus className="size-4" aria-hidden /> Set your first goal</Link>
                </p>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2" aria-label="Goals">
              {visible.map((goal) => <GoalCard key={goal.id} goal={goal} owner={ownerOf(goal)} canManage={canManage} onDelete={handleDelete} />)}
            </ul>
          )}
        </>
      )}
    </>
  )
}
