import { z } from 'zod'
import { RETENTION_MAX_DAYS, RETENTION_MIN_DAYS, type Retention, type Subject } from '../types'

// ---- who the request is about: an email OR a chosen contact, not both ----
export const subjectSchema = z
  .object({ email: z.string().trim().max(254, 'That email is too long'), contactId: z.string() })
  .superRefine((s, ctx) => {
    if (s.email && !z.email().safeParse(s.email).success) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address' })
    if (!s.email && !s.contactId) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter an email address or choose a contact' })
    if (s.email && s.contactId) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Use either an email address or a contact, not both' })
  })
export type SubjectValues = z.infer<typeof subjectSchema>
export const emptySubject: SubjectValues = { email: '', contactId: '' }

export const toSubject = (v: SubjectValues): Subject => (v.email ? { email: v.email.trim() } : { contactId: v.contactId })

// ---- how long logs are kept ----
export const units = [
  { value: 'days', label: 'days', factor: 1 },
  { value: 'months', label: 'months', factor: 30 },
  { value: 'years', label: 'years', factor: 365 },
] as const
type Unit = (typeof units)[number]['value']
const factor = (unit: Unit) => units.find((u) => u.value === unit)!.factor

export const retentionKeys = ['auditLog', 'emailLog', 'notification'] as const
type RetentionKey = (typeof retentionKeys)[number]
const dayField = (k: RetentionKey) => `${k}Days` as const

const unitSchema = z.enum(['days', 'months', 'years'])
export const retentionFormSchema = z
  .object({
    auditLogForever: z.boolean(), auditLogDays: z.string(), auditLogUnit: unitSchema,
    emailLogForever: z.boolean(), emailLogDays: z.string(), emailLogUnit: unitSchema,
    notificationForever: z.boolean(), notificationDays: z.string(), notificationUnit: unitSchema,
  })
  .superRefine((v, ctx) => {
    for (const k of retentionKeys) {
      if (v[`${k}Forever`]) continue
      const amount = Number(v[dayField(k)])
      const total = amount * factor(v[`${k}Unit`])
      const fail = (message: string) => ctx.addIssue({ code: 'custom', path: [dayField(k)], message })
      if (!v[dayField(k)].trim() || !Number.isInteger(amount) || amount < 1) fail('Enter a whole number, like 6')
      else if (total < RETENTION_MIN_DAYS) fail('Keep entries for at least 30 days (1 month), so a typo cannot wipe your history')
      else if (total > RETENTION_MAX_DAYS) fail('The longest you can choose is 10 years. Choose "Keep for ever" instead')
    }
  })
export type RetentionFormValues = z.infer<typeof retentionFormSchema>

// Shows saved days the friendliest way: 365 -> 1 year, 180 -> 6 months, 45 -> 45 days.
function split(days: number | null): { forever: boolean; amount: string; unit: Unit } {
  if (days === null) return { forever: true, amount: '12', unit: 'months' }
  if (days % 365 === 0) return { forever: false, amount: String(days / 365), unit: 'years' }
  if (days % 30 === 0) return { forever: false, amount: String(days / 30), unit: 'months' }
  return { forever: false, amount: String(days), unit: 'days' }
}

export function toRetentionForm(r: Retention): RetentionFormValues {
  const a = split(r.auditLogDays)
  const e = split(r.emailLogDays)
  const n = split(r.notificationDays)
  return {
    auditLogForever: a.forever, auditLogDays: a.amount, auditLogUnit: a.unit,
    emailLogForever: e.forever, emailLogDays: e.amount, emailLogUnit: e.unit,
    notificationForever: n.forever, notificationDays: n.amount, notificationUnit: n.unit,
  }
}

const days = (v: RetentionFormValues, k: RetentionKey) => (v[`${k}Forever`] ? null : Number(v[dayField(k)]) * factor(v[`${k}Unit`]))
export const toRetention = (v: RetentionFormValues): Retention => ({ auditLogDays: days(v, 'auditLog'), emailLogDays: days(v, 'emailLog'), notificationDays: days(v, 'notification') })

/** True when the new policy would delete entries the old one kept (a shorter period, or "for ever" replaced by a limit). */
export const isShortened = (before: number | null, after: number | null) => after !== null && (before === null || after < before)
