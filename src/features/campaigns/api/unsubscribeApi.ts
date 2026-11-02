import axios, { isAxiosError } from 'axios'
import { env } from '@/app/config/env'

// The recipient is not signed in, so this does NOT use the staff httpClient (no cookies, no session handling):
// a dead or mistyped link must only ever say "this link doesn't work", never send anyone to the staff login.
const publicClient = axios.create({ baseURL: `${env.VITE_API_URL.replace(/\/$/, '')}/api/v1/public`, withCredentials: false })

export type UnsubscribeInfo = { email: string; organizationName: string; unsubscribed: boolean }

// The same shape the server checks: 24 random bytes as hex. Anything else cannot be a real link, so we do not even ask.
export const isValidToken = (token: string | undefined): token is string => /^[a-f0-9]{48}$/.test(token ?? '')

export async function getUnsubscribeInfo(token: string, signal?: AbortSignal) {
  const { data } = await publicClient.get<{ data: UnsubscribeInfo }>(`/unsubscribe/${token}`, { signal })
  return data.data
}

export async function unsubscribe(token: string) {
  const { data } = await publicClient.post<{ data: UnsubscribeInfo }>(`/unsubscribe/${token}`)
  return data.data
}

export type UnsubscribeFailure = 'invalid' | 'busy' | 'other'
export const failureOf = (error: unknown): UnsubscribeFailure => {
  if (!isAxiosError(error)) return 'other'
  if (error.response?.status === 404 || error.response?.status === 400) return 'invalid'
  return error.response?.status === 429 ? 'busy' : 'other'
}
