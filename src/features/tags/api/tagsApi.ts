import type { Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { Tag, TaggedContact, TagWithCount } from '../types'

export async function getTags(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: TagWithCount[] }>('/tags', { signal })
  return data.data
}

export async function createTag(payload: { name: string; color: string }, key?: string) {
  const { data } = await httpClient.post<{ data: Tag }>('/tags', payload, idempotent(key))
  return data.data
}
export const updateTag = (id: string, changes: { name?: string; color?: string }) => httpClient.patch(`/tags/${id}`, changes)
// Deleting a tag also removes it from every contact that has it.
export const deleteTag = (id: string) => httpClient.delete(`/tags/${id}`)

export async function getContactTags(contactId: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: Tag[] }>(`/tags/contacts/${contactId}`, { signal })
  return data.data
}
// Replaces the contact's tags with exactly this list.
export async function setContactTags(contactId: string, tagIds: string[]) {
  const { data } = await httpClient.put<{ data: Tag[] }>(`/tags/contacts/${contactId}`, { tagIds })
  return data.data
}

export async function getTagContacts(tagId: string, page: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<TaggedContact>>(`/tags/${tagId}/contacts`, { signal, params: { page, limit: 10 } })
  return data
}
