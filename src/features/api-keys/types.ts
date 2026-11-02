export type ApiKey = {
  id: string
  name: string
  /** First characters of the key, so people can tell keys apart. The key itself is never sent again. */
  keyPrefix: string
  /** Permission keys such as "contacts.view". */
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  createdByName: string | null
}

/** Returned once by POST /api-keys. `key` is the secret; it must never be kept after the reveal dialog closes. */
export type CreatedApiKey = { id: string; name: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; key: string }

export type ApiKeyStatus = 'active' | 'expired' | 'revoked'

export const keyStatus = (key: Pick<ApiKey, 'revokedAt' | 'expiresAt'>, now = Date.now()): ApiKeyStatus =>
  key.revokedAt ? 'revoked' : key.expiresAt && new Date(key.expiresAt).getTime() <= now ? 'expired' : 'active'

export type CreateApiKeyPayload = { name: string; scopes: string[]; expiresInDays: number | null }
