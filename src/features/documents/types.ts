// What a file can be attached to (backend: documentEntityTypes). Seeing a file needs the same right as seeing that record.
export const documentEntityTypes = ['contact', 'company', 'lead', 'deal', 'ticket', 'quote', 'order', 'invoice'] as const
export type DocumentEntityType = (typeof documentEntityTypes)[number]

/** One row of GET /documents: the document with the details of its latest version. */
export type DocumentItem = {
  id: string
  name: string
  entityType: DocumentEntityType
  entityId: string
  currentVersion: number
  createdAt: string
  updatedAt: string
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedByName: string | null
}

export type DocumentVersion = {
  version: number
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string | null
  uploadedByName: string | null
  createdAt: string
}

/** GET /documents/:id: the document row plus every version, newest first. */
export type DocumentDetail = { id: string; name: string; currentVersion: number; versions: DocumentVersion[] }

export type StorageUsage = { usedBytes: number; limitBytes: number }

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
