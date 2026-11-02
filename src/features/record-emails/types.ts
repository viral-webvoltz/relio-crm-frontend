export type EmailEntity = 'lead' | 'contact'

export const emailPaths: Record<EmailEntity, string> = { lead: 'leads', contact: 'contacts' }

export const MAX_EMAIL_SUBJECT = 200
export const MAX_EMAIL_BODY = 10_000

export type RecordEmail = {
  id: string
  direction: 'outbound' | 'inbound' | null
  subject: string
  body: string | null
  emailAddress: string | null
  occurredAt: string
  /** Staff member who sent it; null for replies. */
  sentBy: string | null
  /** What happened to a sent email; null for replies. */
  deliveryStatus: 'queued' | 'sending' | 'sent' | 'failed' | null
  deliveryError: string | null
}
