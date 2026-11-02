import { Badge } from '@/components/ui/Badge'
import { statusLabel, statusTone, type SubscriptionStatus } from '../types'

// The word is always shown, so the status never relies on colour alone.
export const SubscriptionStatusBadge = ({ status }: { status: SubscriptionStatus }) => <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
