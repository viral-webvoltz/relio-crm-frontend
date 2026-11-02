import { format } from 'date-fns'
import { fileNameFrom, saveBlob } from '@/lib/download'
import { httpClient } from '@/lib/httpClient'
import type { EraseResult, Retention, Subject } from '../types'

// The server answers with the person's data as a JSON file. It is saved straight to disk and never kept in the query cache or on screen.
export async function downloadPersonalData(subject: Subject) {
  const { data, headers } = await httpClient.post<unknown>('/privacy/export', subject)
  const fallback = `personal-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fileNameFrom(headers['content-disposition'], fallback))
}

export async function eraseSubject(request: Subject & { dryRun: boolean; confirm?: string }) {
  const { data } = await httpClient.post<{ data: EraseResult }>('/privacy/erase', request)
  return data.data
}

export async function getRetention(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Retention }>('/privacy/retention', { signal })
  return data.data
}

export async function putRetention(retention: Retention) {
  const { data } = await httpClient.put<{ data: Retention }>('/privacy/retention', retention)
  return data.data
}
