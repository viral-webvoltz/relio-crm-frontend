import { CircleCheckBig, Clock, MessageCircleWarning, Settings2, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCan } from '@/features/auth/hooks/useCan'
import { cn } from '@/lib/utils'
import { useSlaSummary } from '../hooks/useSla'

const DAYS = 30

function Stat({ icon: Icon, label, value, hint, to, danger }: { icon: LucideIcon; label: string; value: string; hint?: string; to?: string; danger?: boolean }) {
  const body = (
    <>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted"><Icon className="size-4" aria-hidden /> {label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold', danger ? 'text-destructive' : 'text-heading')}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  )
  const cls = 'card block p-4'
  return <div>{to ? <Link to={to} className={cn(cls, 'hover:border-primary/40')}>{body}</Link> : <div className={cls}>{body}</div>}</div>
}

const rate = (n: number | null) => (n === null ? '—' : `${n}%`)

// What needs attention right now, then how the team did over the last 30 days. Counts with a matching list filter are links.
export function SlaSummaryStrip() {
  const { data } = useSlaSummary(DAYS)
  const canManage = useCan('settings.manage')
  if (!data) return null // a missing summary should never get in the way of the list
  const { now } = data
  return (
    <section aria-label="Response targets summary" className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-heading">Response targets</h2>
        {canManage && <Link to="/settings/sla" className="link-action gap-1"><Settings2 className="size-4" aria-hidden /> Edit targets</Link>}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={TriangleAlert} label="Overdue now" value={String(now.breached)} hint={now.breached > 0 ? 'Open tickets past their resolve time' : 'Nothing is overdue'} to={now.breached > 0 ? '/support?sla=breached' : undefined} danger={now.breached > 0} />
        <Stat icon={Clock} label="Due soon" value={String(now.atRisk)} hint="Open tickets close to their resolve time" />
        <Stat icon={MessageCircleWarning} label="First reply overdue" value={String(now.firstResponseBreached)} hint="Open tickets nobody has answered in time" danger={now.firstResponseBreached > 0} />
        <Stat icon={CircleCheckBig} label="Replied on time" value={rate(data.firstReplyRate)} hint={`Last ${DAYS} days`} />
        <Stat icon={CircleCheckBig} label="Resolved on time" value={rate(data.resolutionRate)} hint={`Last ${DAYS} days`} />
      </dl>
    </section>
  )
}
