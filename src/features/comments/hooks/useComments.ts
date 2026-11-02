import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/commentsApi'
import type { CommentEntity } from '../types'

const commentsKey = (entity: CommentEntity, id: string) => ['comments', entity, id] as const

// Oldest first, so "load more" appends older-to-newer pages under the ones already shown.
export const useComments = (entity: CommentEntity, id: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: commentsKey(entity, id),
    queryFn: ({ pageParam, signal }) => api.getComments(entity, id, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled,
  })

function useRefresh(entity: CommentEntity, id: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: commentsKey(entity, id) })
}

export function useAddComment(entity: CommentEntity, id: string) {
  const refresh = useRefresh(entity, id)
  return useMutation<unknown, ApiError, { body: string; key: string }>({ mutationFn: ({ body, key }) => api.createComment(entity, id, body, key), onSuccess: refresh })
}

export function useEditComment(entity: CommentEntity, id: string) {
  const refresh = useRefresh(entity, id)
  return useMutation<unknown, ApiError, { id: string; body: string }>({ mutationFn: (v) => api.updateComment(v.id, v.body), onSuccess: refresh })
}

export function useDeleteComment(entity: CommentEntity, id: string) {
  const refresh = useRefresh(entity, id)
  return useMutation<unknown, ApiError, string>({ mutationFn: api.deleteComment, onSuccess: refresh })
}
