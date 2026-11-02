import { z } from 'zod'

const eventName = /^(\*|[a-z0-9_]+(\.[a-z0-9_]+)*)$/i

export const splitEvents = (text: string) => [...new Set(text.split(/[\s,]+/).filter(Boolean))]

export const webhookFormSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, 'Enter the address that should receive events')
      .max(2048, 'That address is too long')
      .refine((v) => {
        try {
          return ['https:', 'http:'].includes(new URL(v).protocol)
        } catch {
          return false
        }
      }, 'Enter a full web address, like https://example.com/webhooks'),
    allEvents: z.boolean(),
    events: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.allEvents) return
    const names = splitEvents(v.events)
    if (names.length === 0) ctx.addIssue({ code: 'custom', path: ['events'], message: 'Pick at least one event, or choose “All events”' })
    else if (names.length > 50) ctx.addIssue({ code: 'custom', path: ['events'], message: 'Choose at most 50 events' })
    else if (names.some((n) => !eventName.test(n))) ctx.addIssue({ code: 'custom', path: ['events'], message: 'Use names like leads.create, separated by commas' })
  })

export type WebhookFormValues = z.infer<typeof webhookFormSchema>

export const emptyWebhook: WebhookFormValues = { url: '', allEvents: false, events: '' }

export const toPayload = (v: WebhookFormValues) => ({ url: v.url.trim(), events: v.allEvents ? ['*'] : splitEvents(v.events) })
