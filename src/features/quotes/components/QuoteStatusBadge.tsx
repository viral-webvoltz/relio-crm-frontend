import { Badge } from '@/components/ui/Badge'
import { quoteStatusLabel, quoteStatusTone, type QuoteStatus } from '../types'

// Text label always shown, so the status never relies on colour alone.
export const QuoteStatusBadge = ({ status }: { status: QuoteStatus }) => <Badge tone={quoteStatusTone[status]}>{quoteStatusLabel[status]}</Badge>
