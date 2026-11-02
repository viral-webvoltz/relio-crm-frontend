import type { CampaignStats } from '../types'

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—')

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-heading">{value.toLocaleString()}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  )
}

// Counts with words and percentages, never colour alone; the bar is a visual extra for delivery progress.
export function CampaignStatsPanel({ stats }: { stats: CampaignStats }) {
  const done = stats.sent + stats.failed
  return (
    <section className="card p-5" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="text-base font-semibold text-heading">How it is going</h2>
      <p className="mt-3 text-sm text-body" aria-live="polite">
        {stats.sent.toLocaleString()} of {stats.total.toLocaleString()} emails sent
        {stats.pending > 0 ? ` · ${stats.pending.toLocaleString()} still waiting to go out` : ''}
        {stats.failed > 0 ? ` · ${stats.failed.toLocaleString()} could not be sent` : ''}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background" role="img" aria-label={`${pct(done, stats.total)} of the emails have been handled`}>
        <div className="h-full bg-primary" style={{ width: pct(done, stats.total) === '—' ? '0%' : pct(done, stats.total) }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Opened" value={stats.opened} note={`${pct(stats.opened, stats.sent)} of sent`} />
        <Stat label="Clicked a link" value={stats.clicked} note={`${pct(stats.clicked, stats.sent)} of sent`} />
        <Stat label="Unsubscribed" value={stats.unsubscribed} note={`${pct(stats.unsubscribed, stats.sent)} of sent`} />
      </dl>
      <p className="mt-3 text-xs text-muted">Opens are counted when a picture in the email loads, so some opens are missed and some are automatic. Treat them as a guide.</p>
    </section>
  )
}
