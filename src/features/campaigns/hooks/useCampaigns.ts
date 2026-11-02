import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/campaignsApi'
import type { Campaign, CampaignPayload } from '../types'

const key = ['campaigns'] as const

export const useCampaigns = (params: api.CampaignListParams) =>
  useQuery({ queryKey: [...key, 'list', params], queryFn: ({ signal }) => api.getCampaigns(params, signal), placeholderData: keepPreviousData })

// Emails go out in the background after a launch, so keep the numbers fresh while any are waiting (and while a scheduled send is due).
export const useCampaign = (id: string) =>
  useQuery({
    queryKey: [...key, 'detail', id],
    queryFn: ({ signal }) => api.getCampaign(id, signal),
    refetchInterval: (query) => {
      const c = query.state.data
      if (!c) return false
      if (c.status === 'sent' && c.stats.pending > 0) return 5_000
      return c.status === 'scheduled' ? 20_000 : false
    },
  })

export const useAudience = (id: string | undefined, enabled = true) =>
  useQuery({ queryKey: [...key, 'audience', id], queryFn: ({ signal }) => api.getAudience(id!, signal), enabled: Boolean(id) && enabled, staleTime: 0 })

export const useRecipients = (id: string, params: { page: number; limit: number }) =>
  useQuery({ queryKey: [...key, 'recipients', id, params], queryFn: ({ signal }) => api.getRecipients(id, params, signal), placeholderData: keepPreviousData })

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: key })
}

// One key per opened form: a double click or a retry after a dropped connection cannot create two campaigns.
export function useSaveCampaign(id?: string) {
  const idempotencyKey = useIdempotencyKey()
  const invalidate = useInvalidate()
  return useMutation<Campaign, ApiError, CampaignPayload>({
    mutationFn: (payload) => (id ? api.updateCampaign(id, payload) : api.createCampaign(payload, idempotencyKey)),
    onSuccess: invalidate,
  })
}

export function useDeleteCampaign() {
  const invalidate = useInvalidate()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteCampaign, onSuccess: invalidate })
}

// A fresh key per click: the same key on two different campaigns would be refused as a reuse.
export function useDuplicateCampaign() {
  const invalidate = useInvalidate()
  return useMutation<Campaign, ApiError, string>({ mutationFn: (id) => api.duplicateCampaign(id, crypto.randomUUID()), onSuccess: invalidate })
}

export function useSendTest(id: string) {
  return useMutation<unknown, ApiError, string>({ mutationFn: (to) => api.sendTest(id, to) })
}

// The key is per page visit, so pressing "Send" twice replays the first answer instead of launching twice.
export function useLaunchCampaign(id: string) {
  const idempotencyKey = useIdempotencyKey()
  const invalidate = useInvalidate()
  return useMutation<unknown, ApiError, void>({ mutationFn: () => api.launchCampaign(id, idempotencyKey), onSuccess: invalidate })
}

export function useScheduleCampaign(id: string) {
  const invalidate = useInvalidate()
  return useMutation<unknown, ApiError, string>({ mutationFn: (at) => api.scheduleCampaign(id, at), onSuccess: invalidate })
}

export function useCancelCampaign(id: string) {
  const invalidate = useInvalidate()
  return useMutation<{ held: number }, ApiError, void>({ mutationFn: () => api.cancelCampaign(id), onSuccess: invalidate })
}

export const useSuppressions = (params: { page: number; limit?: number }) =>
  useQuery({ queryKey: ['campaign-suppressions', params], queryFn: ({ signal }) => api.getSuppressions(params, signal), placeholderData: keepPreviousData })

export function useAddSuppression() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.addSuppression, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-suppressions'] }) })
}

export function useRemoveSuppression() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.removeSuppression, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-suppressions'] }) })
}
