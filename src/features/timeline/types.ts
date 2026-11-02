/** The timeline endpoint only exists for contacts (GET /timeline/contacts/:contactId). */
export type TimelineEntity = 'contact'

export type TimelineItem = {
  /** note | call | meeting | email (logged activities) or task | deal | order | invoice | ticket. */
  type: string
  at: string
  title: string
  summary: string | null
  entityType: string
  entityId: string
  actorName: string | null
}

// The server only queries a source when the viewer may see it on its own, so a narrow role sees a shorter timeline, not an error.
export const timelinePermission: Record<TimelineEntity, string> = { contact: 'contacts.view' }
