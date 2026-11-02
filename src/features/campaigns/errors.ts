import type { ApiError } from '@/lib/httpClient'

// The server's messages are written for developers in places; these say what to do instead.
const messages: Record<string, string> = {
  MAIL_NOT_CONFIGURED: 'Email sending is not set up yet. Ask an administrator to configure it.',
  MISSING_UNSUBSCRIBE: 'Add the unsubscribe link to both the email and its plain-text version first.',
  AUDIENCE_TOO_LARGE: 'That is more people than one campaign can reach (10,000). Narrow the audience and try again.',
  NO_RECIPIENTS: 'Nobody in this audience can receive email right now (no address, or they unsubscribed).',
  CAMPAIGN_LOCKED: 'This campaign has already moved on, so that is no longer possible. Reload the page to see where it is.',
  INVALID_SCHEDULE: 'Pick a time in the future, within the next year.',
  INVALID_AUDIENCE: 'The tag or company you picked no longer exists. Choose another audience.',
  RECIPIENT_NOT_ALLOWED: 'A test email can only go to someone who has an account in your organisation.',
  IDEMPOTENCY_KEY_REUSED: 'That request was already sent. Reload the page and try again.',
}

export const campaignMessage = (error: ApiError) => messages[error.code] ?? error.message
