import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as authApi from '../api/authApi'

const twoFactorKey = ['auth', '2fa'] as const
const sessionsKey = ['auth', 'sessions'] as const

export const useTwoFactorStatus = () => useQuery<authApi.TwoFactorStatus, ApiError>({ queryKey: twoFactorKey, queryFn: ({ signal }) => authApi.getTwoFactorStatus(signal), retry: false })

export const useSessions = () => useQuery<authApi.AuthSession[], ApiError>({ queryKey: sessionsKey, queryFn: ({ signal }) => authApi.getSessions(signal), retry: false })

export const useChangePassword = () =>
  useMutation<unknown, ApiError, { currentPassword: string; newPassword: string }>({ mutationFn: ({ currentPassword, newPassword }) => authApi.changePassword(currentPassword, newPassword) })

export const useStartTwoFactorSetup = () => useMutation<authApi.TwoFactorSetup, ApiError, string>({ mutationFn: authApi.startTwoFactorSetup })

// Turning it on also revokes the other sessions, and the response is the only time the recovery codes are shown.
export function useEnableTwoFactor() {
  const queryClient = useQueryClient()
  return useMutation<string[], ApiError, string>({
    mutationFn: authApi.enableTwoFactor,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: twoFactorKey }), queryClient.invalidateQueries({ queryKey: sessionsKey })]),
  })
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { password: string; factor: authApi.SecondFactor }>({
    mutationFn: ({ password, factor }) => authApi.disableTwoFactor(password, factor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twoFactorKey }),
  })
}

export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient()
  return useMutation<string[], ApiError, { password: string; code: string }>({
    mutationFn: ({ password, code }) => authApi.regenerateRecoveryCodes(password, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: twoFactorKey }),
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: authApi.revokeSession, onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey }) })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()
  return useMutation<number, ApiError, void>({ mutationFn: authApi.revokeOtherSessions, onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey }) })
}
