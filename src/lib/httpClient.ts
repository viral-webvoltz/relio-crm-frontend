import axios, { isAxiosError, type AxiosError } from 'axios'
import { env } from '@/app/config/env'

export const httpClient = axios.create({ baseURL: `${env.VITE_API_URL.replace(/\/$/, '')}/api/v1`, withCredentials: true })

export type ApiError = { message: string; code: string; errors: unknown[]; requestId?: string; status?: number }

// Technical codes are replaced with plain language; the backend already logged the details against requestId.
const friendly: Record<string, string> = {
  NETWORK_ERROR: "We can't reach the server. Check your internet connection and try again.",
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again in a moment.',
  VALIDATION_ERROR: 'Some details need fixing. Please check the highlighted fields.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
}

function toApiError(error: AxiosError<Partial<ApiError>>): ApiError {
  if (!error.response) return { message: friendly.NETWORK_ERROR!, code: 'NETWORK_ERROR', errors: [] }
  const body = error.response.data
  const isApiBody = typeof body === 'object' && body !== null && typeof body.code === 'string'
  // Proxies and gateways can answer with HTML or empty bodies.
  const code = isApiBody ? body.code! : error.response.status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'
  return {
    message: friendly[code] ?? (isApiBody && body.message ? body.message : 'We could not complete that request.'),
    code,
    errors: isApiBody ? (body.errors ?? []) : [],
    requestId: isApiBody ? body.requestId : undefined,
    status: error.response.status,
  }
}

// The session token is kept in localStorage and sent as a Bearer header, because the cookie is cross-site (vercel.app -> API domain).
const TOKEN_KEY = 'token'
const store = (token?: string) => { try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* storage blocked: cookie still works where allowed */ } }

httpClient.interceptors.request.use((config) => {
  let token: string | null = null
  try { token = localStorage.getItem(TOKEN_KEY) } catch { /* storage blocked */ }
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

httpClient.interceptors.response.use(
  (response) => {
    const url = response.config.url ?? ''
    if (/^\/auth\/(login|login\/2fa|register)$/.test(url) || url === '/access-links/redeem') store(response.data?.data?.token)
    if (url === '/auth/logout') store()
    return response
  },
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401 && error.config?.url === '/auth/me') store()
    return handle(error)
  },
)

const handle = (error: unknown) => Promise.reject(isAxiosError(error) && !axios.isCancel(error) ? toApiError(error) : error)
