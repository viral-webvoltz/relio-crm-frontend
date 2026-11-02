import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/documentsApi'
import type { DocumentEntityType } from '../types'

const documentsKey = ['documents'] as const

export const useDocuments = (entityType: DocumentEntityType, entityId: string, enabled: boolean) =>
  useQuery({ queryKey: [...documentsKey, 'list', entityType, entityId], queryFn: ({ signal }) => api.getDocuments(entityType, entityId, signal), enabled })

// Loaded only while a document's version list is open.
export const useDocumentVersions = (id: string, enabled: boolean) =>
  useQuery({ queryKey: [...documentsKey, 'detail', id], queryFn: ({ signal }) => api.getDocument(id, signal), enabled })

export const useStorage = (enabled: boolean) => useQuery({ queryKey: [...documentsKey, 'storage'], queryFn: ({ signal }) => api.getStorage(signal), enabled, staleTime: 30_000 })

// Every change can alter the list, a version list and the storage total, so they refresh together.
function useChange<V>(fn: (variables: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, V>({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }) })
}

export const useUploadDocument = () => useChange(api.uploadDocument)
export const useUploadVersion = () => useChange(api.uploadVersion)
export const useRenameDocument = () => useChange(({ id, name }: { id: string; name: string }) => api.renameDocument(id, name))
export const useDeleteDocument = () => useChange(api.deleteDocument)
