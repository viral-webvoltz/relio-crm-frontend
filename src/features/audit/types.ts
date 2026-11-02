export type AuditEntry = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  /** For request-level rows: { source, statusCode, requestId, ipAddress, changes }. Explicit audit() rows carry their own keys. */
  metadata: Record<string, unknown>
  createdAt: string
  actorId: string | null
  actorName: string | null
}

export type AuditFilters = {
  entityType: string
  action: string
  actorId: string
  /** yyyy-MM-dd (local day); sent to the API as an ISO instant. */
  from: string
  to: string
}
