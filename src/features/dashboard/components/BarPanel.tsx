import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type BarPanelProps = {
  title: string
  data: { label: string; value: number }[]
  formatValue?: (value: number) => string
  emptyMessage: string
  footer?: ReactNode
}

// Colours come from the CSS variables so the chart follows the theme.
export function BarPanel({ title, data, formatValue = String, emptyMessage, footer }: BarPanelProps) {
  const hasData = data.some((d) => d.value > 0)
  return (
    <section className="card p-6">
      <h2 className="mb-5 text-base font-semibold text-heading">{title}</h2>
      {hasData ? (
        <div className="h-64" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
              <defs>
                <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={formatValue} />
              <Tooltip
                formatter={(value) => formatValue(Number(value))}
                cursor={{ fill: 'var(--primary-soft)', radius: 12 }}
                contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
              />
              <Bar dataKey="value" fill="url(#bar-fill)" radius={[999, 999, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted">{emptyMessage}</p>
      )}
      {hasData && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer rounded-lg px-1 py-1 text-primary">View as table</summary>
          <table className="mt-2 w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead><tr><th scope="col" className="py-1 font-medium text-muted">Category</th><th scope="col" className="py-1 text-right font-medium text-muted">Value</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.label} className="border-t border-border/60"><th scope="row" className="py-1.5 font-normal capitalize text-body">{d.label}</th><td className="py-1.5 text-right text-heading">{formatValue(d.value)}</td></tr>)}</tbody>
          </table>
        </details>
      )}
      {footer}
    </section>
  )
}
