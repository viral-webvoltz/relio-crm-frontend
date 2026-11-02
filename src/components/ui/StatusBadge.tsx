import { Badge } from './Badge'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

// One status → tone map per domain, so the same status looks identical on every page, card and portal view.
const tones = {
  lead: { new: 'info', contacted: 'neutral', qualified: 'success', unqualified: 'warning', converted: 'success' },
  order: { pending: 'warning', confirmed: 'info', fulfilled: 'success', cancelled: 'neutral' },
  priority: { low: 'neutral', medium: 'info', high: 'danger', urgent: 'danger' },
  active: { active: 'success', inactive: 'neutral' },
} satisfies Record<string, Record<string, Tone>>

export function StatusBadge({ domain, status }: { domain: keyof typeof tones; status: string }) {
  const map: Record<string, Tone> = tones[domain]
  return <Badge tone={map[status] ?? 'neutral'}>{status}</Badge>
}
