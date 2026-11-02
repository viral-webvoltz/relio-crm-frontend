import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { QueueStatus, TriggerMeta, Workflow, WorkflowPayload } from '../types'

export async function getWorkflows(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Workflow[] }>('/workflows', { signal })
  return data.data
}

export const createWorkflow = (payload: WorkflowPayload, idempotencyKey?: string) => httpClient.post('/workflows', payload, idempotent(idempotencyKey))
export const updateWorkflow = (id: string, changes: Partial<WorkflowPayload>) => httpClient.patch(`/workflows/${id}`, changes)
export const deleteWorkflow = (id: string) => httpClient.delete(`/workflows/${id}`)

export async function getSettings(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: { timezone: string } }>('/workflows/settings', { signal })
  return data.data
}
export const updateSettings = (timezone: string) => httpClient.patch('/workflows/settings', { timezone })

export async function getMeta(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: { triggers: TriggerMeta[] } }>('/workflows/meta', { signal })
  return data.data.triggers
}

export async function getQueue(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: QueueStatus }>('/workflows/queue', { signal })
  return data.data
}
