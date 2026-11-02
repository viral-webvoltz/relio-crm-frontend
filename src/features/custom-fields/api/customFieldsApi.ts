import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { CustomFieldDefinition, EntityType, FieldType } from '../types'

export async function getDefinitions(entityType: EntityType, includeInactive: boolean, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: CustomFieldDefinition[] }>('/custom-fields', { signal, params: { entityType, ...(includeInactive && { includeInactive: 'true' }) } })
  return data.data
}

export type CreateDefinition = { entityType: EntityType; key: string; label: string; type: FieldType; options?: string[]; required: boolean; position?: number }
// key and type cannot change after creation (the API rejects them).
export type UpdateDefinition = { label?: string; options?: string[]; required?: boolean; position?: number; isActive?: boolean }

export const createDefinition = (payload: CreateDefinition, key?: string) => httpClient.post('/custom-fields', payload, idempotent(key))
export const updateDefinition = (id: string, changes: UpdateDefinition) => httpClient.patch(`/custom-fields/${id}`, changes)
// "Delete" hides the field: saved values stay stored but are no longer shown or editable.
export const deleteDefinition = (id: string) => httpClient.delete(`/custom-fields/${id}`)
