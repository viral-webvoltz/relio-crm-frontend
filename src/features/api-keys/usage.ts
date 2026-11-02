import { env } from '@/app/config/env'

// Where scripts send their requests, and the API reference the backend serves to admins.
export const apiBaseUrl = `${env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
export const apiDocsUrl = `${apiBaseUrl}/docs/openapi.json`
