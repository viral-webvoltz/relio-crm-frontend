import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/ticketsApi'
import type { SlaPolicy, SlaPolicyPayload } from '../types'

const slaKey = ['tickets', 'sla'] as const

export const useSlaPolicy = () => useQuery({ queryKey: [...slaKey, 'policy'], queryFn: ({ signal }) => api.getSlaPolicy(signal) })

// Counts move as tickets are answered, so keep the strip reasonably fresh while the page is open.
export const useSlaSummary = (days = 30) => useQuery({ queryKey: [...slaKey, 'summary', days], queryFn: ({ signal }) => api.getSlaSummary(days, signal), refetchInterval: 60_000 })

export function useSaveSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation<SlaPolicy, ApiError, SlaPolicyPayload>({
    mutationFn: api.putSlaPolicy,
    // Ticket rows carry their own SLA state, so a new policy makes cached lists stale too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })
}
