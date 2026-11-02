/** Who a personal-data request is about: an email address (finds their contacts and leads) or one specific contact. */
export type Subject = { email?: string; contactId?: string }

/** `counts` has one number per kind of record, keyed by the server's names (see eraseLabels.ts). */
export type EraseResult = { dryRun: boolean; counts: Record<string, number> }

/** Days to keep each log; null means keep for ever. The server allows 30 to 3650. */
export type Retention = { auditLogDays: number | null; emailLogDays: number | null; notificationDays: number | null }
export const RETENTION_MIN_DAYS = 30
export const RETENTION_MAX_DAYS = 3650
