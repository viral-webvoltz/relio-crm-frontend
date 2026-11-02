import { httpClient } from '@/lib/httpClient'
import { mimeFor } from '../uploadRules'
import type { DocumentDetail, DocumentEntityType, DocumentItem, StorageUsage } from '../types'

export async function getDocuments(entityType: DocumentEntityType, entityId: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: DocumentItem[] }>('/documents', { params: { entityType, entityId }, signal })
  return data.data
}

export async function getDocument(id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: DocumentDetail }>(`/documents/${id}`, { signal })
  return data.data
}

export async function getStorage(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: StorageUsage }>('/documents/storage', { signal })
  return data.data
}

type Progress = (percent: number) => void

// The file is the raw request body, sent with its own Content-Type; the metadata travels in the query string.
function rawBody(file: File, onProgress?: Progress) {
  const type = mimeFor(file)
  if (!type) throw new Error('Unsupported file type')
  return {
    headers: { 'Content-Type': type },
    onUploadProgress: (event: { loaded: number; total?: number }) => event.total && onProgress?.(Math.round((event.loaded / event.total) * 100)),
  }
}

export const uploadDocument = ({ entityType, entityId, file, onProgress }: { entityType: DocumentEntityType; entityId: string; file: File; onProgress?: Progress }) =>
  httpClient.post('/documents', file, { ...rawBody(file, onProgress), params: { entityType, entityId, name: file.name.slice(0, 150), fileName: file.name } })

export const uploadVersion = ({ id, file, onProgress }: { id: string; file: File; onProgress?: Progress }) =>
  httpClient.post(`/documents/${id}/versions`, file, { ...rawBody(file, onProgress), params: { fileName: file.name } })

export const renameDocument = (id: string, name: string) => httpClient.patch(`/documents/${id}`, { name })
export const deleteDocument = (id: string) => httpClient.delete(`/documents/${id}`)

// Authenticated download: a plain link would not carry the session, so the bytes are fetched here and saved from memory.
export async function downloadDocument(id: string, version?: number) {
  const res = await httpClient.get<Blob>(`/documents/${id}/download`, { params: { version }, responseType: 'blob' })
  return res.data
}
