import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ApplyResult, Resource, Rule, RuleChanges, RulePayload, TestResult } from '../types'

export async function getRules(resource: Resource, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Rule[] }>('/assignment-rules', { params: { resource }, signal })
  return data.data
}

export const createRule = (payload: RulePayload, idempotencyKey?: string) => httpClient.post('/assignment-rules', payload, idempotent(idempotencyKey))
export const updateRule = (id: string, changes: RuleChanges) => httpClient.patch(`/assignment-rules/${id}`, changes)
export const deleteRule = (id: string) => httpClient.delete(`/assignment-rules/${id}`)

// The given order becomes the evaluation order and must list every rule of that resource, once. Returns the saved order.
export async function reorderRules(resource: Resource, ids: string[]) {
  const { data } = await httpClient.post<{ data: Rule[] }>('/assignment-rules/reorder', { resource, ids })
  return data.data
}

export async function testRules(resource: Resource, sample: Record<string, unknown>) {
  const { data } = await httpClient.post<{ data: TestResult }>('/assignment-rules/test', { resource, sample })
  return data.data
}

export async function applyRules(resource: Resource, idempotencyKey: string) {
  const { data } = await httpClient.post<{ data: ApplyResult }>('/assignment-rules/apply', { resource }, idempotent(idempotencyKey))
  return data.data
}
