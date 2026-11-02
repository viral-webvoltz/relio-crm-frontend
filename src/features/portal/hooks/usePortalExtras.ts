import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/portalExtrasApi'
import { portalMeKey } from './usePortal'

// Everything sits under ['portal'] so signing out clears it with the rest of the customer's data.
export const useNotices = (page: number) => useQuery({ queryKey: ['portal', 'notices', page], queryFn: ({ signal }) => api.getNotices(page, signal), placeholderData: keepPreviousData })
export const useDocuments = (page: number) => useQuery({ queryKey: ['portal', 'documents', page], queryFn: ({ signal }) => api.getDocuments(page, signal), placeholderData: keepPreviousData })
export const useAppointments = (page: number) => useQuery({ queryKey: ['portal', 'appointments', page], queryFn: ({ signal }) => api.getAppointments(page, signal), placeholderData: keepPreviousData })
export const useProfile = () => useQuery({ queryKey: ['portal', 'profile'], queryFn: ({ signal }) => api.getProfile(signal), retry: false })

export function useRequestAppointment() {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  return useMutation<unknown, ApiError, api.AppointmentRequest>({
    mutationFn: (values) => api.requestAppointment(values, key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'appointments'] }),
  })
}

export function useCancelAppointment() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.cancelAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'appointments'] }),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, api.ProfileChanges>({
    mutationFn: api.updateProfile,
    // The header shows the name, so the shared "me" query must refresh too.
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] }), queryClient.invalidateQueries({ queryKey: portalMeKey })]),
  })
}
