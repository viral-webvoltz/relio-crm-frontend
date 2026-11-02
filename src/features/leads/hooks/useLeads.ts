import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/leadsApi'

const leadsKey = ['leads'] as const

export const useLeads = (params: api.LeadListParams) => {
  const query = useQuery({ queryKey: [...leadsKey, 'list', params], queryFn: ({ signal }) => api.getLeads(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...leadsKey, 'list'], params, query.data, api.getLeads)
  return query
}

export const useLead = (id: string | undefined) =>
  useQuery({ queryKey: [...leadsKey, 'detail', id], queryFn: () => api.getLead(id!), enabled: Boolean(id) })

export function useSaveLead(id?: string) {
  const key = useIdempotencyKey()
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, api.LeadSubmit>({
    mutationFn: (values) => (id ? api.updateLead(id, values) : api.createLead(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKey }),
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteLead,
    // The API also removes the lead's tasks and activity.
    onSuccess: () => Promise.all([leadsKey, ['tasks'], ['activities'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.convertLead,
    // Conversion creates (or reuses) a contact, so both lists are stale.
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: leadsKey }), queryClient.invalidateQueries({ queryKey: ['contacts'] })]),
  })
}
