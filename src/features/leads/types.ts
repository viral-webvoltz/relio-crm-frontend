export const leadSources = ['website', 'referral', 'social', 'email', 'event', 'other'] as const
export const leadStatuses = ['new', 'contacted', 'qualified', 'unqualified'] as const
export const leadPriorities = ['low', 'medium', 'high'] as const

export type Lead = {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  companyName: string | null
  source: (typeof leadSources)[number]
  status: (typeof leadStatuses)[number] | 'converted'
  priority: (typeof leadPriorities)[number]
  score: number
  followUpDate: string | null
  assignedTo: string | null
  notes: string | null
  /** Values for the organisation's custom fields, keyed by field name. */
  customFields?: Record<string, unknown> | null
}
