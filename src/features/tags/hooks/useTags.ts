import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/tagsApi'
import type { Tag } from '../types'

const key = ['tags'] as const

export const useTags = () => useQuery({ queryKey: [...key, 'list'], queryFn: ({ signal }) => api.getTags(signal), staleTime: 30_000 })

export const useContactTags = (contactId: string | undefined) =>
  useQuery({ queryKey: [...key, 'contact', contactId], queryFn: ({ signal }) => api.getContactTags(contactId!, signal), enabled: Boolean(contactId) })

export const useTagContacts = (tagId: string | undefined, page: number) =>
  useQuery({ queryKey: [...key, 'contacts', tagId, page], queryFn: ({ signal }) => api.getTagContacts(tagId!, page, signal), enabled: Boolean(tagId), placeholderData: keepPreviousData })

function useTagMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) })
}

// A fresh key per tag created (not per picker): the picker can add several tags, and a reused key would be rejected. A double-click is
// prevented by disabling the create option while the request is pending.
export const useCreateTag = () => useTagMutation<{ name: string; color: string }, Tag>((payload) => api.createTag(payload, crypto.randomUUID()))
export const useUpdateTag = () => useTagMutation<{ id: string; changes: { name?: string; color?: string } }>(({ id, changes }) => api.updateTag(id, changes))
export const useDeleteTag = () => useTagMutation<string>(api.deleteTag)
export const useSetContactTags = () => useTagMutation<{ contactId: string; tagIds: string[] }>(({ contactId, tagIds }) => api.setContactTags(contactId, tagIds))
