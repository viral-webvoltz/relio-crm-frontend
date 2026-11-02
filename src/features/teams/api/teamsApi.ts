import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { Team, TeamDetail, TeamPayload } from '../types'

export async function getTeams(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Team[] }>('/teams', { signal })
  return data.data
}

export async function getTeam(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: TeamDetail }>(`/teams/${id}`, { signal })
  return data.data
}

export async function createTeam(payload: TeamPayload, idempotencyKey?: string) {
  const { data } = await httpClient.post<{ data: { id: string } }>('/teams', payload, idempotent(idempotencyKey))
  return data.data
}

export const updateTeam = (id: string, changes: Partial<TeamPayload>) => httpClient.patch(`/teams/${id}`, changes)
export const setTeamMembers = (id: string, userIds: string[]) => httpClient.put(`/teams/${id}/members`, { userIds })
export const deleteTeam = (id: string) => httpClient.delete(`/teams/${id}`)
