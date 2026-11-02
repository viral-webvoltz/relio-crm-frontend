import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/privacyApi'
import type { EraseResult, Retention, Subject } from '../types'

// Requests about a person must not linger in the shared cache, so these mutations are dropped as soon as they finish (gcTime 0).
export const useDownloadPersonalData = () => useMutation<void, ApiError, Subject>({ mutationFn: api.downloadPersonalData, gcTime: 0 })

export const useEraseSubject = () =>
  useMutation<EraseResult, ApiError, Subject & { dryRun: boolean; confirm?: string }>({ mutationFn: api.eraseSubject, gcTime: 0 })

export const useRetention = () => useQuery({ queryKey: ['privacy', 'retention'], queryFn: ({ signal }) => api.getRetention(signal) })

export function useSaveRetention() {
  const queryClient = useQueryClient()
  return useMutation<Retention, ApiError, Retention>({
    mutationFn: api.putRetention,
    onSuccess: (saved) => queryClient.setQueryData(['privacy', 'retention'], saved),
  })
}
