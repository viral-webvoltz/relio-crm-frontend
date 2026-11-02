import { httpClient } from '@/lib/httpClient'
import { fileNameFrom } from '@/lib/download'
import { idempotent } from '@/lib/idempotency'

// The resources the backend can export (backend/src/modules/exports/exports.registry.ts).
export const exportResources = ['leads', 'contacts', 'companies', 'deals', 'tasks', 'orders', 'products', 'invoices', 'tickets'] as const
export type ExportResource = (typeof exportResources)[number]

export type ExportJob = { status: 'queued' | 'running' | 'done' | 'failed'; progress: number; error: string | null; downloadUrl: string | null }

// The export uses the list's own filters and sort; paging is decided by the server, and blank filters are dropped.
export function toExportQuery(params: Record<string, unknown>) {
  const { page: _page, limit: _limit, ...rest } = params
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

const today = () => new Date().toISOString().slice(0, 10)

// Direct CSV download (up to 5,000 rows). A bigger set answers 413 EXPORT_TOO_LARGE; the caller then uses a job.
export async function quickExport(resource: ExportResource, params: Record<string, unknown>) {
  const res = await httpClient.get<Blob>(`/${resource}/export`, { params: toExportQuery(params), responseType: 'blob' })
  return { blob: res.data, fileName: fileNameFrom(res.headers['content-disposition'], `${resource}-${today()}.csv`) }
}

export async function createExportJob(resource: ExportResource, params: Record<string, unknown>, key: string) {
  const { data } = await httpClient.post<{ data: { jobId: string } }>('/exports', { resource, query: toExportQuery(params) }, idempotent(key))
  return data.data.jobId
}

export async function getExportJob(jobId: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ExportJob }>(`/exports/${jobId}`, { signal })
  return data.data
}

// The signed link the API returns already starts with /api/v1, which httpClient adds itself.
export async function downloadExport(downloadUrl: string, fallbackName: string) {
  const path = downloadUrl.replace(/^\/api\/v1/, '')
  const res = await httpClient.get<Blob>(path, { responseType: 'blob' })
  return { blob: res.data, fileName: fileNameFrom(res.headers['content-disposition'], fallbackName) }
}
