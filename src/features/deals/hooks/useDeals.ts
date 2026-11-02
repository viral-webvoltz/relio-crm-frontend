import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/dealsApi'
import type { DealFormValues } from '../schemas/dealSchema'
import type { Board } from '../types'

const dealsKey = ['deals'] as const
const boardKey = [...dealsKey, 'board'] as const

export const useBoard = () => useQuery({ queryKey: boardKey, queryFn: api.getBoard })

export const useDeals = (params: api.DealListParams) =>
  useQuery({ queryKey: [...dealsKey, 'list', params], queryFn: ({ signal }) => api.getDeals(params, signal), placeholderData: keepPreviousData })

export const useDeal = (id: string | undefined) =>
  useQuery({ queryKey: [...dealsKey, 'detail', id], queryFn: () => api.getDeal(id!), enabled: Boolean(id) })

export function useSaveDeal(id?: string) {
  const key = useIdempotencyKey()
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, DealFormValues>({
    mutationFn: (values) => (id ? api.updateDeal(id, values) : api.createDeal(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealsKey }),
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteDeal,
    // The API also removes the deal's tasks and activity.
    onSuccess: () => Promise.all([dealsKey, ['tasks'], ['activities'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

type MoveVariables = { dealId: string; stageId: string; lostReason?: string }

// Optimistic: the card jumps immediately and rolls back if the server rejects the move.
export function useMoveDeal() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, MoveVariables, { previous?: Board }>({
    mutationFn: ({ dealId, stageId, lostReason }) => api.moveDeal(dealId, stageId, lostReason),
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: boardKey })
      const previous = queryClient.getQueryData<Board>(boardKey)
      if (previous) {
        const deal = previous.stages.flatMap((s) => s.deals).find((d) => d.id === dealId)
        if (deal) {
          queryClient.setQueryData<Board>(boardKey, {
            ...previous,
            stages: previous.stages.map((s) => ({
              ...s,
              deals: s.id === stageId ? [...s.deals.filter((d) => d.id !== dealId), { ...deal, stageId }] : s.deals.filter((d) => d.id !== dealId),
            })),
          })
        }
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey }),
  })
}
