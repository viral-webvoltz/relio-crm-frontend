import type { Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { PortalAppointment, PortalDocument, PortalNotice, PortalProfile } from '../portalExtras'

const page = <T,>(path: string) => async (pageNumber: number, signal?: AbortSignal) => {
  const { data } = await httpClient.get<Paginated<T>>(path, { params: { page: pageNumber }, signal })
  return data
}

export const getNotices = page<PortalNotice>('/portal/notices')
export const getDocuments = page<PortalDocument>('/portal/documents')
export const getAppointments = page<PortalAppointment>('/portal/appointments')

export type AppointmentRequest = { subject: string; notes?: string; startsAt: string; durationMinutes: number }
export const requestAppointment = (values: AppointmentRequest, key?: string) => httpClient.post('/portal/appointments', values, idempotent(key))
export const cancelAppointment = (id: string) => httpClient.post(`/portal/appointments/${id}/cancel`)

export async function getProfile(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: PortalProfile }>('/portal/me', { signal })
  return data.data
}
export type ProfileChanges = { firstName: string; lastName: string | null; phone: string | null }
export const updateProfile = (changes: ProfileChanges) => httpClient.patch<{ data: PortalProfile }>('/portal/me', changes)

// The download needs the customer's session cookie, so it goes through axios and is saved from a blob.
export async function downloadDocument(doc: PortalDocument) {
  const { data } = await httpClient.get<Blob>(`/portal/documents/${doc.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = Object.assign(document.createElement('a'), { href: url, download: doc.fileName })
  link.click()
  URL.revokeObjectURL(url)
}
