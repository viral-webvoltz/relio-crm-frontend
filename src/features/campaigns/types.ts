export const campaignStatuses = ['draft', 'scheduled', 'sent', 'cancelled'] as const
export type CampaignStatus = (typeof campaignStatuses)[number]

export type Audience =
  | { type: 'all' }
  | { type: 'tag'; tagId: string }
  | { type: 'company'; companyId: string }
  | { type: 'contacts'; contactIds: string[] }

export type Campaign = {
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
  audience: Audience
  status: CampaignStatus
  scheduledAt: string | null
  launchedAt: string | null
  /** People the audience matched who could not be emailed (no usable address, or unsubscribed). */
  skippedCount: number
  /** Why a scheduled send could not run; the campaign went back to draft. */
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignStats = { total: number; sent: number; pending: number; failed: number; opened: number; clicked: number; unsubscribed: number }
export type CampaignDetail = Campaign & { stats: CampaignStats }

export type AudiencePreview = { matched: number; willReceive: number; skipped: number; tooLarge: boolean; sample: { name: string; email: string }[] }

export type Recipient = {
  id: string
  contactId: string | null
  email: string
  deliveryStatus: string | null
  deliveryError: string | null
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  unsubscribedAt: string | null
}

export type Suppression = { id: string; email: string; reason: 'unsubscribed' | 'manual'; createdAt: string }

export type CampaignPayload = { name: string; subject: string; bodyHtml: string; bodyText: string; audience: Audience }

export const MAX_RECIPIENTS = 10_000

// The only placeholders the server fills in. Anything else is rejected when saving.
export const variables = [
  { key: 'first_name', label: 'First name', sample: 'Alex' },
  { key: 'last_name', label: 'Last name', sample: 'Example' },
  { key: 'full_name', label: 'Full name', sample: 'Alex Example' },
  { key: 'email', label: 'Email address', sample: 'alex@example.com' },
  { key: 'unsubscribe_link', label: 'Unsubscribe link', sample: 'https://app.example.com/unsubscribe/sample' },
] as const

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g
const UNSUBSCRIBE = /\{\{\s*unsubscribe_link\s*\}\}/

export const unknownPlaceholders = (text: string) => [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '').filter((name) => !variables.some((v) => v.key === name)))]
/** A bulk email must carry the unsubscribe link in both versions, or the server refuses to schedule or send it. */
export const hasUnsubscribe = (bodyHtml: string, bodyText: string) => UNSUBSCRIBE.test(bodyHtml) && UNSUBSCRIBE.test(bodyText)

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
const fill = (template: string, transform: (value: string) => string) =>
  template.replace(PLACEHOLDER, (_, name: string) => transform(variables.find((v) => v.key === name)?.sample ?? ''))
/** What the server would produce for a sample reader (values are escaped in the HTML, left alone in text). */
export const renderSample = ({ subject, bodyHtml, bodyText }: { subject: string; bodyHtml: string; bodyText: string }) => ({
  subject: fill(subject, (v) => v).replace(/[\r\n]+/g, ' ').trim(),
  html: fill(bodyHtml, esc),
  text: fill(bodyText, (v) => v),
})

/** A sent campaign is still "sending" while any of its emails are waiting to go out. */
export const displayStatus = (c: { status: CampaignStatus; stats?: CampaignStats }) => (c.status === 'sent' && (c.stats?.pending ?? 0) > 0 ? 'sending' : c.status)

export const audienceLabel = (a: Audience) =>
  a.type === 'all' ? 'Everyone with an email' : a.type === 'tag' ? 'People with a tag' : a.type === 'company' ? 'People at a company' : `${a.contactIds.length} chosen ${a.contactIds.length === 1 ? 'person' : 'people'}`
