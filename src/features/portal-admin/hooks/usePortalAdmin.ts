import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListParams } from '@/lib/apiTypes'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { AppointmentStatus } from '@/features/portal/portalExtras'
import * as api from '../api/portalAdminApi'

const noticesKey = ['portal-notices'] as const
const documentsKey = ['portal-documents'] as const
const appointmentsKey = ['appointments'] as const

export const useNotices = (params: ListParams) =>
  useQuery({ queryKey: [...noticesKey, params], queryFn: ({ signal }) => api.getNotices(params, signal), placeholderData: keepPreviousData })

export function useSaveNotice(id?: string) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  return useMutation<unknown, ApiError, api.NoticeInput>({
    mutationFn: (values) => (id ? api.updateNotice(id, values) : api.createNotice(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticesKey }),
  })
}

export function useDeleteNotice() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteNotice, onSuccess: () => queryClient.invalidateQueries({ queryKey: noticesKey }) })
}

export const useContactDocuments = (contactId: string, enabled: boolean) =>
  useQuery({ queryKey: [...documentsKey, contactId], queryFn: ({ signal }) => api.getContactDocuments(contactId, signal), enabled })

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { contactId: string; name: string; file: File }>({
    mutationFn: api.uploadDocument,
    onSuccess: (_data, { contactId }) => queryClient.invalidateQueries({ queryKey: [...documentsKey, contactId] }),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteDocument, onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }) })
}

export const useStaffAppointments = (filters: api.AppointmentFilters) =>
  useQuery({ queryKey: [...appointmentsKey, filters], queryFn: ({ signal }) => api.getAppointments(filters, signal), placeholderData: keepPreviousData })

export function useSetAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { id: string; status: AppointmentStatus }>({
    mutationFn: ({ id, status }) => api.setAppointmentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentsKey }),
  })
}
