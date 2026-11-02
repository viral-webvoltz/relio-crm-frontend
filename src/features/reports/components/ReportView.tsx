import { format, parseISO } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/money'
import type { LeadsReport, PipelineReport, ReportOutput, RevenueReport } from '../types'

const percent = (rate: number | null) => (rate == null ? '—' : `${Math.round(rate * 1000) / 10}%`)
const money = (minor: number, currency: string | null) => (currency ? formatMoney(minor, currency) : '0')
const monthLabel = (month: string) => format(parseISO(`${month}-01`), 'MMM yyyy')
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const rangeText = (r: { from: string; to: string }) => `${format(parseISO(r.from), 'd MMM yyyy')} – ${format(parseISO(r.to), 'd MMM yyyy')}`

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

// A horizontal bar per row. The number is always written out, so the bar is a hint, not the information.
function BarList({ items, label }: { items: { label: string; value: number; detail?: string }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul aria-label={label} className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-body">{item.label}</span>
            <span className="font-medium text-heading">{item.value}{item.detail && <span className="ml-2 font-normal text-muted">{item.detail}</span>}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-background" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Revenue({ data }: { data: RevenueReport }) {
  const currencies = [...new Set(data.rows.map((r) => r.currency))]
  return (
    <div className="space-y-6">
      {currencies.map((currency) => {
        const rows = data.rows.filter((r) => r.currency === currency)
        const chart = rows.map((r) => ({ label: monthLabel(r.month), Invoiced: r.invoicedMinor / 100, Collected: r.collectedMinor / 100 }))
        const total = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((sum, r) => sum + pick(r), 0)
        const hasMoney = chart.some((c) => c.Invoiced > 0 || c.Collected > 0)
        const fmt = (n: number) => money(Math.round(n * 100), currency)
        return (
          <section key={currency ?? 'none'} className="card p-6" aria-label={currency ? `Revenue in ${currency}` : 'Revenue'}>
            <h2 className="mb-1 text-base font-semibold text-heading">{currency ? `Revenue in ${currency}` : 'Revenue'}</h2>
            <p className="mb-4 text-sm text-muted">
              Invoiced {fmt(total((r) => r.invoicedMinor) / 100)} · collected {fmt(total((r) => r.collectedMinor) / 100)} · {total((r) => r.orderCount)} orders
            </p>
            {hasMoney ? (
              <div className="h-72" role="img" aria-label={`Invoiced and collected by month${currency ? ` in ${currency}` : ''}: ${chart.map((c) => `${c.label} invoiced ${fmt(c.Invoiced)}, collected ${fmt(c.Collected)}`).join('; ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={(v) => fmt(Number(v))} />
                    <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: 'var(--primary-soft)' }} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="Invoiced" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Collected" fill="var(--success)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted">No invoices or payments in this period.</p>
            )}
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer rounded-lg px-1 py-2 text-primary">View as table</summary>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full min-w-[32rem] text-left">
                  <caption className="sr-only">Revenue by month{currency ? ` in ${currency}` : ''}</caption>
                  <thead>
                    <tr className="text-muted">
                      <th scope="col" className="py-1 font-medium">Month</th>
                      <th scope="col" className="py-1 text-right font-medium">Invoiced</th>
                      <th scope="col" className="py-1 text-right font-medium">Collected</th>
                      <th scope="col" className="py-1 text-right font-medium">Orders</th>
                      <th scope="col" className="py-1 text-right font-medium">Order value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.month} className="border-t border-border/60">
                        <th scope="row" className="py-1.5 font-normal text-body">{monthLabel(r.month)}</th>
                        <td className="py-1.5 text-right text-heading">{money(r.invoicedMinor, currency)}</td>
                        <td className="py-1.5 text-right text-heading">{money(r.collectedMinor, currency)}</td>
                        <td className="py-1.5 text-right text-heading">{r.orderCount}</td>
                        <td className="py-1.5 text-right text-heading">{money(r.orderTotalMinor, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )
      })}
    </div>
  )
}

const kindTone = { won: 'success', lost: 'danger', open: 'neutral' } as const

function Pipeline({ data }: { data: PipelineReport }) {
  const stages = [...data.stages].sort((a, b) => a.position - b.position)
  const { summary } = data
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Deals won" value={String(summary.won)} hint="In this period" />
        <Stat label="Deals lost" value={String(summary.lost)} hint="In this period" />
        <Stat label="Win rate" value={percent(summary.winRate)} hint="Won out of won and lost" />
        <Stat label="Days to win" value={summary.avgDaysToWon == null ? '—' : String(summary.avgDaysToWon)} hint="Average, roughly" />
      </div>

      <section className="card p-6" aria-label="Deals by stage">
        <h2 className="mb-1 text-base font-semibold text-heading">Deals by stage right now</h2>
        <p className="mb-4 text-sm text-muted">A snapshot of today, not of the period you picked.</p>
        {stages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">There are no deal stages yet.</p>
        ) : (
          <>
            <BarList label="Deals per stage" items={stages.map((s) => ({ label: s.stage, value: s.dealCount, detail: s.valueMinor > 0 && s.currency ? formatMoney(s.valueMinor, s.currency) : undefined }))} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">Deals by stage</caption>
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="py-1 font-medium">Stage</th>
                    <th scope="col" className="py-1 font-medium">Type</th>
                    <th scope="col" className="py-1 text-right font-medium">Deals</th>
                    <th scope="col" className="py-1 text-right font-medium">Value</th>
                    <th scope="col" className="py-1 text-right font-medium">Average age (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s) => (
                    <tr key={s.stageId} className="border-t border-border/60">
                      <th scope="row" className="py-1.5 font-normal text-body">{s.stage}</th>
                      <td className="py-1.5"><Badge tone={kindTone[s.kind as keyof typeof kindTone] ?? 'neutral'}>{s.kind}</Badge></td>
                      <td className="py-1.5 text-right text-heading">{s.dealCount}</td>
                      <td className="py-1.5 text-right text-heading">{s.currency ? formatMoney(s.valueMinor, s.currency) : '—'}</td>
                      <td className="py-1.5 text-right text-heading">{s.avgAgeDays ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {data.wonByCurrency.length > 0 && (
        <section className="card p-6" aria-label="Won deals by currency">
          <h2 className="mb-3 text-base font-semibold text-heading">Won deals</h2>
          <ul className="space-y-1 text-sm text-body">
            {data.wonByCurrency.map((w) => (
              <li key={w.currency}>
                <span className="font-medium text-heading">{formatMoney(w.valueMinor, w.currency)}</span> from {w.count} deal{w.count === 1 ? '' : 's'} in {w.currency}, about {formatMoney(w.avgValueMinor, w.currency)} each
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.notes.length > 0 && (
        <details className="card p-5 text-sm">
          <summary className="min-h-11 cursor-pointer rounded-lg px-1 py-2 font-medium text-primary">How these numbers are worked out</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </div>
  )
}

const statusOrder = ['new', 'contacted', 'qualified', 'unqualified', 'converted']
const rank = (status: string) => (statusOrder.includes(status) ? statusOrder.indexOf(status) : statusOrder.length)

function Leads({ data }: { data: LeadsReport }) {
  const byStatus = [...data.byStatus].sort((a, b) => rank(a.status) - rank(b.status))
  const bySource = [...data.bySource].sort((a, b) => b.count - a.count)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Leads" value={String(data.total)} hint="Added in this period" />
        <Stat label="Converted" value={String(data.converted)} />
        <Stat label="Conversion rate" value={percent(data.conversionRate)} />
      </div>
      {data.total === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">No leads were added in this period.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-label="Leads by status">
            <h2 className="mb-4 text-base font-semibold text-heading">By status</h2>
            <BarList label="Leads per status" items={byStatus.map((s) => ({ label: title(s.status), value: s.count }))} />
          </section>
          <section className="card p-6" aria-label="Leads by source">
            <h2 className="mb-4 text-base font-semibold text-heading">By source</h2>
            <BarList label="Leads per source" items={bySource.map((s) => ({ label: title(s.source), value: s.count }))} />
          </section>
        </div>
      )}
    </div>
  )
}

// Renders any report result (a live run or a saved report's run) the same way.
export function ReportView({ output }: { output: ReportOutput }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">For {rangeText(output.data.range)}</p>
      {output.type === 'revenue-by-month' && <Revenue data={output.data} />}
      {output.type === 'pipeline-velocity' && <Pipeline data={output.data} />}
      {output.type === 'leads-funnel' && <Leads data={output.data} />}
    </div>
  )
}
