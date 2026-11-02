import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as authApi from '../api/authApi'

export const currentUserKey = ['auth', 'me'] as const

// A 401 is an expected "logged out" answer, not a failure worth retrying.
export function useCurrentUser() {
  return useQuery({ queryKey: currentUserKey, queryFn: authApi.getCurrentUser, retry: false, staleTime: 5 * 60_000 })
}

// Resolves to a challenge when a second step is needed (no session yet), or null when signed in.
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation<authApi.LoginChallenge | null, ApiError, Parameters<typeof authApi.login>[0]>({
    mutationFn: authApi.login,
    onSuccess: (challenge) => (challenge ? undefined : queryClient.invalidateQueries({ queryKey: currentUserKey })),
  })
}

export function useLoginTwoFactor() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { challengeToken: string; factor: authApi.SecondFactor }>({
    mutationFn: ({ challengeToken, factor }) => authApi.loginTwoFactor(challengeToken, factor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, Parameters<typeof authApi.register>[0]>({
    mutationFn: authApi.register,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => queryClient.clear(),
  })
}

export const useForgotPassword = () => useMutation<unknown, ApiError, string>({ mutationFn: authApi.forgotPassword })

export const useResetPassword = () => useMutation<unknown, ApiError, { token: string; newPassword: string }>({ mutationFn: ({ token, newPassword }) => authApi.resetPassword(token, newPassword) })
