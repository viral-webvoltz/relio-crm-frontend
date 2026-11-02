import { Badge } from '@/components/ui/Badge'
import { displayStatus, type CampaignStats, type CampaignStatus } from '../types'

const tone = { draft: 'neutral', scheduled: 'info', sending: 'info', sent: 'success', cancelled: 'warning' } as const

// The word is always shown, never colour alone. "Sending" is a sent campaign that still has emails waiting to go out.
export function CampaignStatusBadge({ status, stats }: { status: CampaignStatus; stats?: CampaignStats }) {
  const shown = displayStatus({ status, stats })
  return <Badge tone={tone[shown]}>{shown}</Badge>
}
