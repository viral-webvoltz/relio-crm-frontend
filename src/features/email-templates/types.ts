export type TemplateKey = 'invoice' | 'quote' | 'ticket_reply' | 'ticket_received'

export type EmailTemplate = {
  key: TemplateKey
  subject: string
  bodyHtml: string
  bodyText: string
  /** True once the organization saved its own wording; false means the built-in default is in use. */
  isOverridden: boolean
  /** The only placeholders this email may use (the server rejects any other on save). */
  variables: string[]
  updatedAt: string | null
}

export type TemplateDraft = { subject: string; bodyHtml: string; bodyText: string }
export type TemplatePreview = { subject: string; html: string; text: string }

// Plain-language names for the technical keys and placeholders the backend uses.
export const templateInfo: Record<TemplateKey, { name: string; when: string }> = {
  invoice: { name: 'Invoice', when: 'Sent to a customer when you choose “Send by email” on an invoice.' },
  quote: { name: 'Quote', when: 'Sent to a customer when you choose “Send” on a quote. It carries the link where they accept or decline.' },
  ticket_reply: { name: 'Support reply', when: 'Sent to the customer when your team replies to their support ticket.' },
  ticket_received: { name: 'Ticket received', when: 'Sent automatically when a customer’s email opens a new support ticket.' },
}

export const variableLabel: Record<string, string> = {
  invoice_number: 'Invoice number',
  due_date: 'Due date',
  total: 'Total',
  balance: 'Balance due',
  customer_name: 'Customer name',
  items: 'Line items',
  quote_number: 'Quote number',
  valid_until: 'Valid until',
  link: 'Quote link',
  ticket_number: 'Ticket number',
  subject: 'Ticket subject',
  reply_body: 'Reply text',
}
