export const relatedTypes = ['lead', 'deal', 'contact', 'company'] as const
export type RelatedType = (typeof relatedTypes)[number]

export const activityTypes = ['note', 'call', 'meeting', 'email'] as const

export type Activity = {
  id: string
  type: (typeof activityTypes)[number]
  subject: string
  body: string | null
  occurredAt: string
  relatedType: RelatedType
  relatedId: string
  createdByName: string | null
}

// Where a related record is edited, used to link back from tasks and the activity feed.
export const relatedRoutes: Record<RelatedType, string> = {
  lead: '/leads',
  deal: '/deals',
  contact: '/contacts',
  company: '/companies',
}
