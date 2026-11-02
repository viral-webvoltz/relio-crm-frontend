import { format, parseISO } from 'date-fns'
import { Trophy } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import type { ApiError } from '@/lib/httpClient'
import { cn } from '@/lib/utils'
import { formatAmount } from '../format'
import { metricInfo, type Leaderboard } from '../types'

type Props = { data?: Leaderboard; loading: boolean; error: ApiError | null; onRetry: () => void; meId?: string }

// Ranked people for one metric and period. The server only ranks people with a result above zero.
export function LeaderboardTable({ data, loading, error, onRetry, meId }: Props) {
  if (loading) return <TableSkeleton rows={5} />
  if (error) return <div className="card"><ErrorState message={error.message} onRetry={onRetry} /></div>
  if (!data || data.entries.length === 0) {
    return <div className="card"><EmptyState icon={Trophy} title="Nobody on the board yet" hint="People appear here once they have a result in this period." /></div>
  }
  const range = `${format(parseISO(data.startDate), 'd MMM')} – ${format(parseISO(data.endDate), 'd MMM yyyy')}`
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="px-5 py-3 text-left text-sm text-muted">
          {metricInfo(data.metric)?.label}, {range}
        </caption>
        <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-16 px-5 py-3 font-medium">Rank</th>
            <th scope="col" className="px-5 py-3 font-medium">Person</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">{metricInfo(data.metric)?.short}</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => {
            const you = entry.userId === meId
            return (
              <tr key={entry.userId} className={cn('border-t border-border/60', you && 'bg-primary-soft/60')}>
                <td className="px-5 py-3 font-semibold text-heading">{entry.rank}</td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={entry.name} />
                    <span className="font-medium text-heading">{entry.name}</span>
                    {you && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">You</span>}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-heading">{formatAmount(data.metric, entry.value, data.currency)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
