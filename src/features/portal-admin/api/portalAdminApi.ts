import type { ListParams, Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { AppointmentStatus, PortalAppointment, PortalDocument } from '@/features/portal/portalExtras'

export type Notice = {
  id: string
  title: string
  body: string
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}
export type NoticeInput = { title: string; body: string; isPublished: boolean; expiresAt: string | null }

export async function getNotices(params: ListParams, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Notice>>('/portal-notices', { params: { page: params.page, limit: params.limit }, signal })
  return data
}
export const createNotice = (values: NoticeInput, key?: string) => httpClient.post('/portal-notices', values, idempotent(key))
export const updateNotice = (id: string, values: Partial<NoticeInput>) => httpClient.patch(`/portal-notices/${id}`, values)
export const deleteNotice = (id: string) => httpClient.delete(`/portal-notices/${id}`)

export type StaffDocument = PortalDocument & { contactId: string; uploadedBy: string | null }

export async function getContactDocuments(contactId: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<StaffDocument>>('/portal-documents', { params: { contactId, page: 1, limit: 100 }, signal })
  return data
}
// The file is the raw request body and its Content-Type; name and file name travel in the query string.
export const uploadDocument = ({ contactId, name, file }: { contactId: string; name: string; file: File }) =>
  httpClient.post('/portal-documents', file, { params: { contactId, name, fileName: file.name }, headers: { 'Content-Type': file.type } })
export const deleteDocument = (id: string) => httpClient.delete(`/portal-documents/${id}`)

export type StaffAppointment = PortalAppointment & { contactId: string; contactFirstName: string; contactLastName: string | null; assignedTo: string | null; staffNotes: string | null }
export type AppointmentFilters = ListParams & { status: string }

export async function getAppointments({ status, page, limit }: AppointmentFilters, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<StaffAppointment>>('/appointments', { params: { page, limit, status: status || undefined }, signal })
  return data
}
export const setAppointmentStatus = (id: string, status: AppointmentStatus) => httpClient.patch(`/appointments/${id}`, { status })
