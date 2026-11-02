import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { CreateGoalPayload, Goal, GoalDetail, GoalWhen, Leaderboard, Metric } from '../types'

export type GoalListParams = { when: GoalWhen; metric?: Metric; userId?: string }

export async function getGoals({ when, metric, userId }: GoalListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Goal[] }>('/goals', { signal, params: { when, metric: metric || undefined, userId: userId || undefined } })
  return data.data
}

export async function getGoal(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: GoalDetail }>(`/goals/${id}`, { signal })
  return data.data
}

export type LeaderboardParams = { metric: Metric; period: 'month' | 'quarter' | 'year'; currency?: string }

export async function getLeaderboard({ metric, period, currency }: LeaderboardParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Leaderboard }>('/goals/leaderboard', { signal, params: { metric, period, currency: currency || undefined, limit: 20 } })
  return data.data
}

export const createGoal = (payload: CreateGoalPayload, key: string) => httpClient.post('/goals', payload, idempotent(key))
// Only the name and the target can change once a goal exists (what it measures, for whom and when is fixed).
export const updateGoal = (id: string, changes: { name?: string; target?: number }) => httpClient.patch(`/goals/${id}`, changes)
export const deleteGoal = (id: string) => httpClient.delete(`/goals/${id}`)
