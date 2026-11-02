import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCan } from '@/features/auth/hooks/useCan'
import { getTeams } from '@/features/teams/api/teamsApi'
import { teamsKey } from '@/features/teams/hooks/useTeams'
import { useUserOptions } from '@/features/users/hooks/useUsers'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/goalsApi'
import type { CreateGoalPayload, Goal, GoalDetail, Leaderboard } from '../types'

const goalsKey = ['goals'] as const

export const useGoals = (params: api.GoalListParams, enabled = true) =>
  useQuery<Goal[], ApiError>({ queryKey: [...goalsKey, 'list', params], queryFn: ({ signal }) => api.getGoals(params, signal), placeholderData: keepPreviousData, enabled })

export const useGoal = (id: string | undefined) => useQuery<GoalDetail, ApiError>({ queryKey: [...goalsKey, 'detail', id], queryFn: ({ signal }) => api.getGoal(id!, signal), enabled: Boolean(id) })

export const useLeaderboard = (params: api.LeaderboardParams, enabled: boolean) =>
  useQuery<Leaderboard, ApiError>({ queryKey: [...goalsKey, 'leaderboard', params], queryFn: ({ signal }) => api.getLeaderboard(params, signal), enabled, placeholderData: keepPreviousData })

// One key per opened form, so a double click or a retry after a dropped connection cannot create two goals.
export function useSaveGoal(id?: string) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  return useMutation<unknown, ApiError, { create?: CreateGoalPayload; changes?: { name?: string; target?: number } }>({
    mutationFn: ({ create, changes }) => (id ? api.updateGoal(id, changes ?? {}) : api.createGoal(create!, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey }),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteGoal, onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey }) })
}

/**
 * Names for the people and teams a goal belongs to. Goal rows only carry ids. Teams are only readable by admins
 * (settings.manage / users.manage), so for everyone else a team goal is shown as "A team goal".
 */
export function useOwnerNames() {
  const users = useUserOptions()
  const canManageSettings = useCan('settings.manage')
  const canManageUsers = useCan('users.manage')
  const canSeeTeams = canManageSettings || canManageUsers
  const teams = useQuery({ queryKey: [...teamsKey, 'list'], queryFn: ({ signal }) => getTeams(signal), enabled: canSeeTeams })
  const userNames = new Map((users.data ?? []).map((u) => [u.id, u.fullName]))
  const teamNames = new Map(canSeeTeams ? (teams.data ?? []).map((t) => [t.id, t.name]) : [])
  return {
    userName: (id: string | null) => (id ? (userNames.get(id) ?? 'A teammate') : ''),
    teamName: (id: string | null) => (id ? (teamNames.get(id) ?? 'A team') : ''),
    teams: canSeeTeams ? (teams.data ?? []) : [],
    canSeeTeams,
    people: users.data ?? [],
  }
}
