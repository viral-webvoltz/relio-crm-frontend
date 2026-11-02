import { httpClient } from '@/lib/httpClient'
import { fileNameFrom } from '@/lib/download'

// The resources the backend can import (backend/src/modules/imports/imports.registry.ts).
export const importResources = ['leads', 'contacts', 'companies', 'products', 'tasks'] as const
export type ImportResource = (typeof importResources)[number]

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024
export const IMPORT_MAX_ROWS = 10_000

export type Mapping = Record<string, string> // { field: CSV column header }

export type Preview = { columns: string[]; sampleRows: string[][]; totalRows: number; fields: string[]; suggestedMapping: Mapping }
export type Validation = { valid: number; invalidCount: number; invalid: { row: number; errors: string[] }[]; truncated: boolean }
export type ImportJob = {
  status: 'queued' | 'running' | 'done' | 'failed'
  progress: number
  total: number | null
  created: number | null
  failed: number | null
  error: string | null
  hasErrorFile: boolean
}

// The file goes as the raw body; the mapping travels in a header.
const send = (file: File, mapping?: Mapping) => ({
  body: file,
  config: { headers: { 'Content-Type': 'text/csv', ...(mapping && { 'X-Import-Mapping': JSON.stringify(mapping) }) } },
})

export async function previewImport(resource: ImportResource, file: File) {
  const { body, config } = send(file)
  const { data } = await httpClient.post<{ data: Preview }>(`/${resource}/import/preview`, body, config)
  return data.data
}

export async function validateImport(resource: ImportResource, file: File, mapping: Mapping) {
  const { body, config } = send(file, mapping)
  const { data } = await httpClient.post<{ data: Validation }>(`/${resource}/import/validate`, body, config)
  return data.data
}

export async function commitImport(resource: ImportResource, file: File, mapping: Mapping) {
  const { body, config } = send(file, mapping)
  const { data } = await httpClient.post<{ data: { jobId: string } }>(`/${resource}/import/commit`, body, config)
  return data.data.jobId
}

export async function getImportJob(jobId: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: ImportJob }>(`/imports/${jobId}`, { signal })
  return data.data
}

export async function downloadImportErrors(jobId: string) {
  const res = await httpClient.get<Blob>(`/imports/${jobId}/errors.csv`, { responseType: 'blob' })
  return { blob: res.data, fileName: fileNameFrom(res.headers['content-disposition'], 'import-errors.csv') }
}
