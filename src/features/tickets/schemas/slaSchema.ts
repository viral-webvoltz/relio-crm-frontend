import { z } from 'zod'
import type { SlaPolicy, SlaPolicyPayload, TicketPriority } from '../types'

export const units = ['minutes', 'hours', 'days'] as const
export type Unit = (typeof units)[number]
const perUnit: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 }
const MAX_MINUTES = 90 * 1440 // the server's limit: 90 days
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const slaPriorities: TicketPriority[] = ['urgent', 'high', 'medium', 'low']
export const weekdays = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

const amount = z.string().trim().regex(/^\d+$/, 'Enter a whole number, 1 or more').refine((v) => Number(v) >= 1, 'Enter a whole number, 1 or more')
const toMinutes = (value: string, unit: Unit) => Number(value) * perUnit[unit]

const target = z
  .object({ frValue: amount, frUnit: z.enum(units), resValue: amount, resUnit: z.enum(units) })
  .superRefine((t, ctx) => {
    const reply = toMinutes(t.frValue, t.frUnit)
    const resolve = toMinutes(t.resValue, t.resUnit)
    if (reply > MAX_MINUTES) ctx.addIssue({ code: 'custom', path: ['frValue'], message: 'Use 90 days or less' })
    if (resolve > MAX_MINUTES) ctx.addIssue({ code: 'custom', path: ['resValue'], message: 'Use 90 days or less' })
    if (reply <= MAX_MINUTES && resolve <= MAX_MINUTES && reply > resolve) ctx.addIssue({ code: 'custom', path: ['frValue'], message: 'The first reply cannot be due after the resolve time' })
  })

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const slaFormSchema = z
  .object({
    targets: z.object({ urgent: target, high: target, medium: target, low: target }),
    always: z.boolean(),
    days: z.array(z.string()),
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
    warnAtPercent: z.string().trim().regex(/^\d+$/, 'Enter a number from 1 to 99').refine((v) => Number(v) >= 1 && Number(v) <= 99, 'Enter a number from 1 to 99'),
    applyToOpen: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.always) return
    if (v.days.length === 0) ctx.addIssue({ code: 'custom', path: ['days'], message: 'Choose at least one working day' })
    if (!HHMM.test(v.start)) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Choose an opening time' })
    if (!HHMM.test(v.end)) ctx.addIssue({ code: 'custom', path: ['end'], message: 'Choose a closing time' })
    if (HHMM.test(v.start) && HHMM.test(v.end) && v.start >= v.end) ctx.addIssue({ code: 'custom', path: ['end'], message: 'Closing time must be after opening time' })
    if (!validZone(v.timezone.trim())) ctx.addIssue({ code: 'custom', path: ['timezone'], message: 'Enter a timezone like Asia/Kolkata' })
  })

export type SlaFormValues = z.infer<typeof slaFormSchema>

// Largest unit that divides the minutes exactly, so 1440 shows as "1 day" and 90 as "90 minutes".
const split = (minutes: number): { value: string; unit: Unit } => {
  if (minutes % 1440 === 0) return { value: String(minutes / 1440), unit: 'days' }
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: 'hours' }
  return { value: String(minutes), unit: 'minutes' }
}

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function toFormValues(policy: SlaPolicy): SlaFormValues {
  const entry = (p: TicketPriority) => {
    const reply = split(policy.targets[p].firstResponseMinutes)
    const resolve = split(policy.targets[p].resolutionMinutes)
    return { frValue: reply.value, frUnit: reply.unit, resValue: resolve.value, resUnit: resolve.unit }
  }
  const hours = policy.businessHours
  return {
    targets: { urgent: entry('urgent'), high: entry('high'), medium: entry('medium'), low: entry('low') },
    always: hours === null,
    days: hours ? hours.days.map(String) : ['1', '2', '3', '4', '5'],
    start: hours?.start ?? '09:00',
    end: hours?.end ?? '17:00',
    timezone: hours?.timezone ?? browserZone(),
    warnAtPercent: String(policy.warnAtPercent),
    applyToOpen: false,
  }
}

export function toPayload(v: SlaFormValues): SlaPolicyPayload {
  const entry = (p: TicketPriority) => ({ firstResponseMinutes: toMinutes(v.targets[p].frValue, v.targets[p].frUnit), resolutionMinutes: toMinutes(v.targets[p].resValue, v.targets[p].resUnit) })
  return {
    targets: { urgent: entry('urgent'), high: entry('high'), medium: entry('medium'), low: entry('low') },
    businessHours: v.always ? null : { timezone: v.timezone.trim(), days: v.days.map(Number).sort((a, b) => a - b), start: v.start, end: v.end },
    warnAtPercent: Number(v.warnAtPercent),
    applyToOpen: v.applyToOpen,
  }
}

// The server speaks in minutes and its own field names; the form speaks in amount + unit. Map its error paths onto the inputs.
export const serverFieldName = (name: string) =>
  name
    .replace(/\.firstResponseMinutes$/, '.frValue')
    .replace(/\.resolutionMinutes$/, '.resValue')
    .replace(/^businessHours\.(days|start|end|timezone)$/, '$1')
    .replace(/^businessHours$/, 'start')
