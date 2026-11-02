import { Badge } from '@/components/ui/Badge'
import { isOverdue, statusTone, type Invoice } from '../types'

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, 'status' | 'dueDate'> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
      {isOverdue(invoice) && <Badge tone="danger">overdue</Badge>}
    </span>
  )
}
