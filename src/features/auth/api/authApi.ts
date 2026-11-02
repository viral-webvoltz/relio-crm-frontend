import { httpClient } from '@/lib/httpClient'
import type { LoginValues, RegisterValues } from '../schemas/authSchemas'

export type CurrentUser = {
  id: string
  organizationId: string
  organization: { name: string; slug: string } | null
  email: string
  fullName: string
  permissions: string[]
}

export async function getCurrentUser() {
  const { data } = await httpClient.get<{ data: CurrentUser }>('/auth/me')
  return data.data
}

/** When two-step verification is on, sign-in answers with a short-lived challenge instead of starting a session. */
export type LoginChallenge = { challengeToken: string }

export async function login(values: LoginValues): Promise<LoginChallenge | null> {
  const { data } = await httpClient.post<{ data?: { twoFactorRequired?: boolean; challengeToken?: string } }>('/auth/login', { ...values, organizationSlug: values.organizationSlug || undefined })
  return data.data?.twoFactorRequired && data.data.challengeToken ? { challengeToken: data.data.challengeToken } : null
}

/** Exactly one of `code` (authenticator app) or `recoveryCode`. */
export type SecondFactor = { code: string } | { recoveryCode: string }

export const loginTwoFactor = (challengeToken: string, factor: SecondFactor) => httpClient.post('/auth/login/2fa', { challengeToken, ...factor })
export const register = (values: RegisterValues) => httpClient.post('/auth/register', values)
export const logout = () => httpClient.post('/auth/logout')

export const forgotPassword = (email: string) => httpClient.post('/auth/forgot-password', { email })
export const resetPassword = (token: string, newPassword: string) => httpClient.post('/auth/reset-password', { token, newPassword })
export const changePassword = (currentPassword: string, newPassword: string) => httpClient.post('/auth/change-password', { currentPassword, newPassword })

// ---- two-step verification ----

export type TwoFactorStatus = { enabled: boolean; setupPending: boolean; recoveryCodesRemaining: number }
export type TwoFactorSetup = { secret: string; otpauthUrl: string }

export async function getTwoFactorStatus(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: TwoFactorStatus }>('/auth/2fa', { signal })
  return data.data
}
export async function startTwoFactorSetup(password: string) {
  const { data } = await httpClient.post<{ data: TwoFactorSetup }>('/auth/2fa/setup', { password })
  return data.data
}
export async function enableTwoFactor(code: string) {
  const { data } = await httpClient.post<{ data: { recoveryCodes: string[] } }>('/auth/2fa/enable', { code })
  return data.data.recoveryCodes
}
export const disableTwoFactor = (password: string, factor: SecondFactor) => httpClient.post('/auth/2fa/disable', { password, ...factor })
export async function regenerateRecoveryCodes(password: string, code: string) {
  const { data } = await httpClient.post<{ data: { recoveryCodes: string[] } }>('/auth/2fa/recovery-codes', { password, code })
  return data.data.recoveryCodes
}

// ---- sessions ----

export type AuthSession = { id: string; createdAt: string; lastSeenAt: string | null; expiresAt: string; userAgent: string | null; ipAddress: string | null; current: boolean }

export async function getSessions(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: AuthSession[] }>('/auth/sessions', { signal })
  return data.data
}
export const revokeSession = (id: string) => httpClient.delete(`/auth/sessions/${id}`)
export async function revokeOtherSessions() {
  const { data } = await httpClient.post<{ data: { revoked: number } }>('/auth/sessions/revoke-others')
  return data.data.revoked
}
