import { format, isBefore, parseISO, startOfToday } from 'date-fns'
import { Badge } from '@/components/ui/Badge'

// Overdue is spelled out in text, not just colour.
export function DueDate({ dueDate, isDone }: { dueDate: string | null; isDone: boolean }) {
  if (!dueDate) return <span className="text-muted">—</span>
  const due = parseISO(dueDate)
  return (
    <span className="flex items-center gap-2">
      {format(due, 'd MMM yyyy')}
      {!isDone && isBefore(due, startOfToday()) && <Badge tone="danger">overdue</Badge>}
    </span>
  )
}
