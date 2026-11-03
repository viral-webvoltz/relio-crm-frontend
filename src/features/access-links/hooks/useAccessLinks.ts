import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/accessLinksApi'

const listKey = ['access-links', 'list'] as const

export const useAccessLinks = () => useQuery({ queryKey: listKey, queryFn: ({ signal }) => api.getAccessLinks(signal) })

export function useCreateAccessLink() {
  const queryClient = useQueryClient()
  return useMutation<api.CreatedAccessLink, ApiError, number>({
    mutationFn: api.createAccessLink,
    gcTime: 0, // the result holds the one-time secret
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  })
}

export function useRevokeAccessLink() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.revokeAccessLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  })
}

export const useRedeemAccessLink = () => useMutation<unknown, ApiError, string>({ mutationFn: api.redeemAccessLink })
