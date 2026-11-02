import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { ReportOutput, ReportRange, ReportType, SavedReport, Schedule, SchedulePayload } from '../types'

const clean = ({ from, to }: ReportRange) => ({ from: from || undefined, to: to || undefined })

export async function getReport(type: ReportType, range: ReportRange, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ReportOutput['data'] }>(`/reports/${type}`, { params: clean(range), signal })
  return { type, data: data.data } as ReportOutput
}

export async function getSavedReports(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: SavedReport[] }>('/reports/saved', { signal })
  return data.data
}

export const createSavedReport = (payload: { name: string; reportType: ReportType; params: ReportRange }, idempotencyKey?: string) =>
  httpClient.post('/reports/saved', { ...payload, params: clean(payload.params) }, idempotent(idempotencyKey))
export const updateSavedReport = (id: string, changes: { name?: string; params?: ReportRange }) =>
  httpClient.patch(`/reports/saved/${id}`, { ...changes, ...(changes.params && { params: clean(changes.params) }) })
export const deleteSavedReport = (id: string) => httpClient.delete(`/reports/saved/${id}`)

export async function runSavedReport(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ReportOutput }>(`/reports/saved/${id}/run`, { signal })
  return data.data
}

export async function getSchedules(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Schedule[] }>('/reports/schedules', { signal })
  return data.data
}

export const createSchedule = (payload: SchedulePayload, idempotencyKey?: string) => httpClient.post('/reports/schedules', payload, idempotent(idempotencyKey))
export const updateSchedule = (id: string, changes: Partial<Omit<SchedulePayload, 'savedReportId'>>) => httpClient.patch(`/reports/schedules/${id}`, changes)
export const deleteSchedule = (id: string) => httpClient.delete(`/reports/schedules/${id}`)
