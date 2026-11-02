import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/customFieldsApi'
import type { EntityType } from '../types'

const key = ['custom-fields'] as const

/** Active fields for a record form. Shared by every form of that entity, and cached so opening a form is instant. */
export const useCustomFieldDefinitions = (entity: EntityType) =>
  useQuery({ queryKey: [...key, entity, 'active'], queryFn: ({ signal }) => api.getDefinitions(entity, false, signal), staleTime: 60_000 })

/** All fields including hidden ones, for the settings page. */
export const useAllCustomFieldDefinitions = (entity: EntityType) =>
  useQuery({ queryKey: [...key, entity, 'all'], queryFn: ({ signal }) => api.getDefinitions(entity, true, signal) })

function useDefinitionMutation<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, V>({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) })
}

export function useCreateDefinition() {
  const idempotencyKey = useIdempotencyKey()
  return useDefinitionMutation<api.CreateDefinition>((payload) => api.createDefinition(payload, idempotencyKey))
}
export const useUpdateDefinition = () => useDefinitionMutation<{ id: string; changes: api.UpdateDefinition }>(({ id, changes }) => api.updateDefinition(id, changes))
export const useDeleteDefinition = () => useDefinitionMutation<string>(api.deleteDefinition)
