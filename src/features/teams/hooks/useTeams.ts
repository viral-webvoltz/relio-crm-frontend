import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/teamsApi'
import type { TeamPayload } from '../types'

export const teamsKey = ['teams'] as const

export const useTeams = () => useQuery({ queryKey: [...teamsKey, 'list'], queryFn: ({ signal }) => api.getTeams(signal) })

export const useTeam = (id: string | undefined) => useQuery({ queryKey: [...teamsKey, 'detail', id], queryFn: ({ signal }) => api.getTeam(id!, signal), enabled: Boolean(id) })

// Every team change can also change what a rule's summary says ("Sales team (4 people)"), so rules refresh too.
function useTeamMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn: fn,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: teamsKey }), queryClient.invalidateQueries({ queryKey: ['assignment-rules'] })]),
  })
}

export const useCreateTeam = () => useTeamMutation<{ payload: TeamPayload; key: string }, { id: string }>(({ payload, key }) => api.createTeam(payload, key))
export const useUpdateTeam = () => useTeamMutation<{ id: string; changes: Partial<TeamPayload> }>(({ id, changes }) => api.updateTeam(id, changes))
export const useSetMembers = () => useTeamMutation<{ id: string; userIds: string[] }>(({ id, userIds }) => api.setTeamMembers(id, userIds))
export const useDeleteTeam = () => useTeamMutation<string>(api.deleteTeam)
