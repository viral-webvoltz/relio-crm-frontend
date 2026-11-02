import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { AlertTriangle, CircleDollarSign, Receipt, Trophy, Target, Users, Wallet } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useSetTaskStatus } from '@/features/tasks/hooks/useTasks'
import { DueDate } from '@/features/tasks/components/DueDate'
import { toast } from 'sonner'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { formatMoney } from '@/lib/money'
import { BarPanel } from '../components/BarPanel'
import { StatCard } from '../components/StatCard'
import { MyGoalsCard } from '@/features/goals/components/MyGoalsCard'
import { Delta } from '../components/Delta'
import { RangePicker } from '../components/RangePicker'
import { useDashboardSummary } from '../hooks/useDashboard'

// ponytail: the dashboard shows deal values in USD; follow the org currency once settings exist.
const money = (minor: number) => formatMoney(minor, 'USD')

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const range = { from: searchParams.get('from') ?? undefined, to: searchParams.get('to') ?? undefined }
  const { data, isPending, isFetching, isError, error, refetch } = useDashboardSummary(range)
  const setRange = (next: { from?: string; to?: string }) =>
    setSearchParams(() => {
      const params = new URLSearchParams()
      if (next.from) params.set('from', next.from)
      if (next.to) params.set('to', next.to)
      return params
    })
  const { data: user } = useCurrentUser()
  const setStatus = useSetTaskStatus()
  const [today] = useState(() => new Date())

  if (isPending) return <PageSkeleton />
  if (isError) {
    return (
      <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
    )
  }

  const { contacts, companies, leads, deals, invoices, orders, tasks } = data
  const firstName = user?.fullName.split(' ')[0]

  return (
    <>
      <PageHeader title={firstName ? `Welcome back, ${firstName}!` : 'Dashboard'} subtitle={format(today, 'EEEE, d MMMM yyyy')} />
      <RangePicker value={range} onChange={setRange} />
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        Showing {format(parseISO(data.range.from), 'd MMM yyyy')} – {format(parseISO(data.range.to), 'd MMM yyyy')}, compared with the {format(parseISO(data.range.previousFrom), 'd MMM')} – {format(parseISO(data.range.previousTo), 'd MMM yyyy')} before it.
        {isFetching && ' Updating…'}
      </p>
      <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'} aria-busy={isFetching}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {deals && <StatCard icon={CircleDollarSign} tone="blue" to="/deals" label="Open pipeline value" value={money(deals.openValueMinor)} hint={`${deals.openCount} active deals`} />}
        {deals && <StatCard icon={Trophy} tone="green" to="/deals" label="Won revenue" value={money(deals.wonValueMinor.value)} delta={<Delta {...deals.wonValueMinor} />} hint={`${deals.wonCount.value} deals won`} />}
        {leads && <StatCard icon={Target} tone="violet" to="/leads" label="Leads" value={String(leads.total.value)} delta={<Delta {...leads.total} />} hint={`${leads.conversionRate.value}% converted`} />}
        {contacts !== null && <StatCard icon={Users} tone="amber" to="/contacts" label="Contacts" value={String(contacts)} hint={companies !== null ? `${companies} companies` : undefined} />}
      </div>

      {(invoices || orders) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {invoices && <StatCard icon={Wallet} tone="green" to="/invoices" label="Revenue collected" value={money(invoices.collectedMinor.value)} delta={<Delta {...invoices.collectedMinor} />} hint="Payments received, minus refunds" />}
          {invoices && <StatCard icon={Receipt} tone="amber" to="/invoices?status=unpaid" label="Outstanding" value={money(invoices.outstandingMinor)} hint="Unpaid invoice balances" />}
          {invoices && (
            <StatCard
              icon={AlertTriangle}
              tone="violet"
              to="/invoices?status=overdue"
              label="Overdue"
              value={money(invoices.overdueMinor)}
              hint={invoices.overdueCount === 0 ? 'Nothing overdue' : `${invoices.overdueCount} overdue ${invoices.overdueCount === 1 ? 'invoice' : 'invoices'}`}
            />
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {deals && (
          <BarPanel
            title="Pipeline by stage"
            data={deals.byStage.map((s) => ({ label: s.stage, value: s.valueMinor / 100 }))}
            formatValue={(v) => money(v * 100)}
            emptyMessage="No deals yet — create one to see your pipeline."
          />
        )}
        {leads && (
          <BarPanel
            title="Leads by source"
            data={leads.bySource.map((s) => ({ label: s.source, value: s.count }))}
            emptyMessage="No leads yet."
          />
        )}
      </div>

      <div className="mt-4 empty:hidden">
        <MyGoalsCard />
      </div>

      {tasks && (
        <section className="card mt-4 p-6" aria-labelledby="my-tasks">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="my-tasks" className="text-base font-semibold text-heading">
              Tasks <span className="ml-2 text-sm font-normal text-muted">{tasks.open} open{tasks.overdue > 0 && `, ${tasks.overdue} overdue`}</span>
            </h2>
            <Link to="/tasks" className="link-action">View all</Link>
          </div>
          {tasks.upcoming.length === 0 ? (
            <p className="py-6 text-sm text-muted">You are all caught up.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {tasks.upcoming.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <label className="flex min-h-8 items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={false}
                      disabled={setStatus.isPending}
                      onChange={() => setStatus.mutate({ id: task.id, status: 'done' }, { onSuccess: () => toast.success('Task completed'), onError: (e) => toast.error(e.message) })}
                      aria-label={`Mark "${task.title}" as done`}
                    />
                    <span className="font-medium text-heading">{task.title}</span>
                  </label>
                  <DueDate dueDate={task.dueDate} isDone={false} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {orders && (
        <section className="card mt-4 p-6" aria-labelledby="recent-orders">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="recent-orders" className="text-base font-semibold text-heading">Recent orders</h2>
            <Link to="/orders" className="link-action">View all</Link>
          </div>
          {orders.recent.length === 0 ? (
            <p className="py-6 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {orders.recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">#{order.orderNumber}</Link>
                    <span className="ml-3 text-muted">{order.customerName ?? 'Walk-in'}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <StatusBadge domain="order" status={order.status} />
                    <span className="w-24 text-right font-medium text-heading">{formatMoney(order.totalMinor, order.currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {leads && (
        <section className="card mt-4 p-6">
          <h2 className="mb-2 text-base font-semibold text-heading">Recent leads</h2>
          {leads.recent.length === 0 ? (
            <p className="py-6 text-sm text-muted">No leads yet.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {leads.recent.map((lead) => {
                const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
                return (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="flex items-center gap-3 font-medium text-heading">
                      <Avatar name={name} /> {name}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="capitalize text-muted">{lead.source}</span>
                      <StatusBadge domain="lead" status={lead.status} />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
      </div>
    </>
  )
}
