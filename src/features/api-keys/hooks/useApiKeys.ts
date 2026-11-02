import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/apiKeysApi'
import type { CreateApiKeyPayload, CreatedApiKey } from '../types'

const keysKey = ['api-keys'] as const

export const useApiKeys = () => useQuery({ queryKey: [...keysKey, 'list'], queryFn: ({ signal }) => api.getApiKeys(signal) })
export const useScopes = () => useQuery({ queryKey: [...keysKey, 'scopes'], queryFn: ({ signal }) => api.getScopes(signal), staleTime: 5 * 60_000 })

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation<CreatedApiKey, ApiError, CreateApiKeyPayload>({
    mutationFn: api.createApiKey,
    // The result holds the one-time secret: keep it out of the shared mutation cache (the page holds it only while the reveal dialog is open).
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...keysKey, 'list'] }),
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...keysKey, 'list'] }),
  })
}
