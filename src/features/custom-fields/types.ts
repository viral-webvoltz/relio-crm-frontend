// The backend supports custom fields on leads, contacts and deals (not companies or products).
export const entityTypes = ['lead', 'contact', 'deal'] as const
export type EntityType = (typeof entityTypes)[number]
export const entityLabel: Record<EntityType, { singular: string; plural: string }> = {
  lead: { singular: 'lead', plural: 'Leads' },
  contact: { singular: 'contact', plural: 'Contacts' },
  deal: { singular: 'deal', plural: 'Deals' },
}

export const fieldTypes = ['text', 'number', 'date', 'boolean', 'select'] as const
export type FieldType = (typeof fieldTypes)[number]
export const typeLabel: Record<FieldType, string> = { text: 'Text', number: 'Number', date: 'Date', boolean: 'Yes / no', select: 'Choose from a list' }

export type CustomFieldDefinition = {
  id: string
  entityType: EntityType
  /** Stable name used in the saved data; cannot change after creation. */
  key: string
  label: string
  type: FieldType
  options: string[] | null
  required: boolean
  position: number
  isActive: boolean
}
