import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import * as api from '../api/reportsApi'
import type { ReportRange, ReportType, SchedulePayload } from '../types'

const reportsKey = ['reports'] as const
const savedKey = [...reportsKey, 'saved'] as const
const schedulesKey = [...reportsKey, 'schedules'] as const

export const useReport = (type: ReportType | undefined, range: ReportRange) =>
  useQuery({
    queryKey: [...reportsKey, 'live', type, range],
    queryFn: ({ signal }) => api.getReport(type!, range, signal),
    enabled: Boolean(type),
    placeholderData: keepPreviousData,
  })

export const useSavedReports = () => useQuery({ queryKey: savedKey, queryFn: ({ signal }) => api.getSavedReports(signal) })

export const useRunSavedReport = (id: string | undefined) =>
  useQuery({ queryKey: [...reportsKey, 'run', id], queryFn: ({ signal }) => api.runSavedReport(id!, signal), enabled: Boolean(id) })

// A double click or a retry after a dropped connection reuses one key and saves a single report; a new key is made after each
// success, so saving a second report from the same page is not mistaken for a repeat of the first.
export function useCreateSavedReport() {
  const queryClient = useQueryClient()
  const [key, setKey] = useState(() => crypto.randomUUID())
  return useMutation<unknown, ApiError, { name: string; reportType: ReportType; params: ReportRange }>({
    mutationFn: (payload) => api.createSavedReport(payload, key),
    onSuccess: () => {
      setKey(crypto.randomUUID())
      return queryClient.invalidateQueries({ queryKey: savedKey })
    },
  })
}

export function useUpdateSavedReport() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { id: string; changes: { name?: string; params?: ReportRange } }>({
    mutationFn: ({ id, changes }) => api.updateSavedReport(id, changes),
    // A changed range changes what a saved report returns when run.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }),
  })
}

export function useDeleteSavedReport() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteSavedReport,
    // Deleting a saved report also removes its schedules on the server.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }),
  })
}

export const useSchedules = () => useQuery({ queryKey: schedulesKey, queryFn: ({ signal }) => api.getSchedules(signal) })

export function useSaveSchedule(id?: string) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  return useMutation<unknown, ApiError, SchedulePayload>({
    mutationFn: ({ savedReportId, ...rest }) => (id ? api.updateSchedule(id, rest) : api.createSchedule({ savedReportId, ...rest }, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKey }),
  })
}

export function useToggleSchedule() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => api.updateSchedule(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKey }),
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKey }),
  })
}
