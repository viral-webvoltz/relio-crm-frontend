import { useState } from 'react'

// One key per form instance: a double-click or a retry after a dropped connection sends the same key,
// so the API returns the first result instead of creating a second record. A new form gets a new key.
export const useIdempotencyKey = () => useState(() => crypto.randomUUID())[0]

export const idempotent = (key?: string) => (key ? { headers: { 'Idempotency-Key': key } } : undefined)
