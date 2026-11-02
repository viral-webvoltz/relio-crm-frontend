import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import { useRefreshAll } from '@/lib/useBatch'
import * as api from '../api/assignmentApi'
import type { ApplyResult, Resource, Rule, RuleChanges, RulePayload, TestResult } from '../types'

export const rulesKey = ['assignment-rules'] as const

export const useRules = (resource: Resource) => useQuery({ queryKey: [...rulesKey, resource], queryFn: ({ signal }) => api.getRules(resource, signal) })

function useRuleMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKey }) })
}

// One key per opened dialog: a double-click or a retry after a dropped connection can't create two rules.
export function useSaveRule(id?: string) {
  const key = useIdempotencyKey()
  return useRuleMutation<RulePayload | RuleChanges>((p) => (id ? api.updateRule(id, p as RuleChanges) : api.createRule(p as RulePayload, key)))
}

export const useToggleRule = () => useRuleMutation<{ id: string; isActive: boolean }>(({ id, isActive }) => api.updateRule(id, { isActive }))
export const useDeleteRule = () => useRuleMutation<string>(api.deleteRule)

export function useReorderRules() {
  const queryClient = useQueryClient()
  return useMutation<Rule[], ApiError, { resource: Resource; ids: string[] }>({
    mutationFn: ({ resource, ids }) => api.reorderRules(resource, ids),
    onSuccess: (rules, { resource }) => queryClient.setQueryData([...rulesKey, resource], rules),
  })
}

export const useTestRules = () => useMutation<TestResult, ApiError, { resource: Resource; sample: Record<string, unknown> }>({ mutationFn: ({ resource, sample }) => api.testRules(resource, sample) })

// Assigning changes real leads and tickets, so their lists and the dashboard refresh afterwards.
export function useApplyRules() {
  const refreshAll = useRefreshAll()
  const queryClient = useQueryClient()
  return useMutation<ApplyResult, ApiError, { resource: Resource; key: string }>({
    mutationFn: ({ resource, key }) => api.applyRules(resource, key),
    // The shared refresh list has no tickets entry.
    onSuccess: () => Promise.all([refreshAll(), queryClient.invalidateQueries({ queryKey: ['tickets'] })]),
  })
}
