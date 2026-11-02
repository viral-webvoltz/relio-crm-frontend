import { httpClient } from './httpClient'

export type BatchResource = 'leads' | 'contacts' | 'companies' | 'products' | 'tasks'
export type BatchResult = { succeeded: string[]; failed: { id: string; code: string; message: string }[] }
export type BatchRequest = { action: 'delete' } | { action: 'update'; changes: Record<string, unknown> }

// One request for the whole selection. The API answers 200 even when some items fail, so read `failed`.
export async function postBatch(resource: BatchResource, ids: string[], request: BatchRequest) {
  const { data } = await httpClient.post<{ data: BatchResult }>(`/${resource}/batch`, { ...request, ids })
  return data.data
}

// Deleting is a soft delete: a record can be brought back from the trash.
export type RestorableResource = BatchResource | 'deals'
export const restoreRecord = (resource: RestorableResource, id: string) => httpClient.post(`/${resource}/${id}/restore`)
