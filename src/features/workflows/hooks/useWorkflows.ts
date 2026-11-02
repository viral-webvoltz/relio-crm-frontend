import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/workflowsApi'
import type { WorkflowPayload } from '../types'

const key = ['workflows'] as const

/** Triggers with their fields and choices, as the server knows them. Rarely changes. */
export const useWorkflowMeta = () => useQuery({ queryKey: ['workflow-meta'], queryFn: ({ signal }) => api.getMeta(signal), staleTime: Infinity })

/** Events waiting to be processed and runs parked on a delay; refreshed while the list page is open. */
export const useWorkflowQueue = () => useQuery({ queryKey: ['workflow-queue'], queryFn: ({ signal }) => api.getQueue(signal), refetchInterval: 15_000, retry: false })

export const useWorkflows = () => useQuery({ queryKey: key, queryFn: ({ signal }) => api.getWorkflows(signal) })

function useWorkflowMutation<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, V>({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) })
}

// One key per opened editor: a double-click or a retry after a dropped connection can't create two workflows.
export function useSaveWorkflow(id?: string) {
  const key = useIdempotencyKey()
  return useWorkflowMutation<WorkflowPayload>((p) => (id ? api.updateWorkflow(id, p) : api.createWorkflow(p, key)))
}
export const useToggleWorkflow = () => useWorkflowMutation<{ id: string; isActive: boolean }>(({ id, isActive }) => api.updateWorkflow(id, { isActive }))
export const useDeleteWorkflow = () => useWorkflowMutation<string>(api.deleteWorkflow)

/** The organization's default clock for scheduled workflows that don't name their own timezone. */
export const useWorkflowSettings = () => useQuery({ queryKey: ['workflow-settings'], queryFn: ({ signal }) => api.getSettings(signal), staleTime: 60_000 })

export function useUpdateWorkflowSettings() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.updateSettings,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }), queryClient.invalidateQueries({ queryKey: key })]),
  })
}

// Scheduled runs act as the workflow's creator; when they are gone, the caller takes the workflow over.
export const useRunAsMe = () => useWorkflowMutation<string>((id) => api.updateWorkflow(id, { runAsMe: true }))
