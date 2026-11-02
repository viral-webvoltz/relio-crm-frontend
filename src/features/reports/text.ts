import { format, parseISO } from 'date-fns'
import type { ReportRange, Schedule } from './types'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const d = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

export const weekdayName = (n: number | null) => WEEKDAYS[n ?? 0] ?? ''
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00 UTC`

export const periodText = ({ from, to }: ReportRange) =>
  !from && !to ? 'Last 12 months' : from && to ? `${d(from)} – ${d(to)}` : from ? `From ${d(from)}` : `Up to ${d(to!)}`

// "Every Monday at 09:00 UTC" — plain language for what the backend stores as frequency + day + hour.
export function whenText(s: Pick<Schedule, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'hourUtc'>) {
  const at = hourLabel(s.hourUtc)
  if (s.frequency === 'daily') return `Every day at ${at}`
  if (s.frequency === 'weekly') return `Every ${weekdayName(s.dayOfWeek)} at ${at}`
  return `On day ${s.dayOfMonth} of every month at ${at}`
}

/** What a UTC hour is on the viewer's own clock today, e.g. "14:00 for you". Shown next to the UTC picker. */
export function localHint(hourUtc: number) {
  const now = new Date()
  const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc))
  return `${format(at, 'HH:mm')} for you`
}
