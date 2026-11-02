// These mirror the backend (documents.validation / portal-documents.validation). The server stays the authority and answers 415 / 413 otherwise.
export const ALLOWED = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
} as const

export const MAX_BYTES = 10 * 1024 * 1024
export const ACCEPT = Object.keys(ALLOWED).join(',')
export const TYPE_LIST = Object.values(ALLOWED).join(', ')

const BY_EXTENSION: Record<string, keyof typeof ALLOWED> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/** The Content-Type to upload with, or null when the file is not an allowed kind. */
export function mimeFor(file: File): string | null {
  if (file.type in ALLOWED) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  // Windows often reports a .csv as application/vnd.ms-excel, and some browsers leave the type empty.
  const unknown = file.type === '' || (extension === 'csv' && file.type === 'application/vnd.ms-excel')
  return unknown ? (BY_EXTENSION[extension] ?? null) : null
}

/** A plain-language reason this file cannot be uploaded, or '' when it is fine. */
export function fileProblem(file: File): string {
  if (!mimeFor(file)) return `That file type is not supported. Use ${TYPE_LIST}.`
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_BYTES) return 'That file is too large. The limit is 10 MB.'
  return ''
}

export const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toUpperCase().slice(0, 5) : 'FILE'
}
