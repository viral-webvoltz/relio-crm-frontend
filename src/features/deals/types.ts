export type Deal = {
  id: string
  title: string
  valueMinor: number
  currency: string
  stageId: string
  expectedCloseDate: string | null
  contactId: string | null
  companyId: string | null
  lostReason: string | null
  /** Values for the organisation's custom fields, keyed by field name. */
  customFields?: Record<string, unknown> | null
}

export type Stage = {
  id: string
  name: string
  kind: 'open' | 'won' | 'lost'
  position: number
  deals: Deal[]
}

export type Board = { pipeline: { id: string; name: string }; stages: Stage[] }
