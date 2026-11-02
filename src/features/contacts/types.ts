export type Contact = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
  notes: string | null
  companyId: string | null
  companyName?: string | null
  /** Values for the organisation's custom fields, keyed by field name. */
  customFields?: Record<string, unknown> | null
}
