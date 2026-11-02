import { z } from 'zod'
import { unknownPlaceholders, variables, type Audience, type Campaign, type CampaignPayload } from '../types'

export const campaignFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the campaign a name').max(120, 'Keep the name under 120 characters'),
    subject: z.string().trim().min(1, 'Add a subject line').max(200, 'Keep the subject under 200 characters'),
    bodyHtml: z.string().min(1, 'Write the email').max(20_000, 'The email is too long (20,000 characters at most)'),
    bodyText: z.string().min(1, 'Add a plain-text version of the email').max(20_000, 'The text version is too long (20,000 characters at most)'),
    audienceType: z.enum(['all', 'tag', 'company', 'contacts']),
    tagId: z.string(),
    companyId: z.string(),
    contactIds: z.array(z.string()).max(1000, 'Choose at most 1,000 people, or use a tag instead'),
  })
  .superRefine((v, ctx) => {
    if (v.audienceType === 'tag' && !v.tagId) ctx.addIssue({ code: 'custom', path: ['tagId'], message: 'Choose a tag' })
    if (v.audienceType === 'company' && !v.companyId) ctx.addIssue({ code: 'custom', path: ['companyId'], message: 'Choose a company' })
    if (v.audienceType === 'contacts' && v.contactIds.length === 0) ctx.addIssue({ code: 'custom', path: ['contactIds'], message: 'Choose at least one person' })
    const unknown = unknownPlaceholders(`${v.subject}\n${v.bodyHtml}\n${v.bodyText}`)
    if (unknown.length)
      ctx.addIssue({ code: 'custom', path: ['bodyHtml'], message: `Unknown placeholder: ${unknown.map((u) => `{{${u}}}`).join(', ')}. Use only ${variables.map((x) => `{{${x.key}}}`).join(', ')}.` })
  })

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

export const emptyCampaign: CampaignFormValues = {
  name: '',
  subject: '',
  bodyHtml: '<p>Hi {{first_name}},</p>\n<p>Write your message here.</p>\n<p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>',
  bodyText: 'Hi {{first_name}},\n\nWrite your message here.\n\nUnsubscribe: {{unsubscribe_link}}',
  audienceType: 'all',
  tagId: '',
  companyId: '',
  contactIds: [],
}

export const toFormValues = (c: Campaign): CampaignFormValues => ({
  name: c.name,
  subject: c.subject,
  bodyHtml: c.bodyHtml,
  bodyText: c.bodyText,
  audienceType: c.audience.type,
  tagId: c.audience.type === 'tag' ? c.audience.tagId : '',
  companyId: c.audience.type === 'company' ? c.audience.companyId : '',
  contactIds: c.audience.type === 'contacts' ? c.audience.contactIds : [],
})

const audienceOf = (v: CampaignFormValues): Audience =>
  v.audienceType === 'tag' ? { type: 'tag', tagId: v.tagId } : v.audienceType === 'company' ? { type: 'company', companyId: v.companyId } : v.audienceType === 'contacts' ? { type: 'contacts', contactIds: v.contactIds } : { type: 'all' }

export const toPayload = (v: CampaignFormValues): CampaignPayload => ({ name: v.name.trim(), subject: v.subject.trim(), bodyHtml: v.bodyHtml, bodyText: v.bodyText, audience: audienceOf(v) })
