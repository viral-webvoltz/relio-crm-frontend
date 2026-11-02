import type { Paginated } from '@/lib/apiTypes'
import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { Comment, CommentEntity } from '../types'

export const COMMENTS_PAGE_SIZE = 50

export async function getComments(entityType: CommentEntity, entityId: string, page: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<Paginated<Comment>>('/comments', { params: { entityType, entityId, page, limit: COMMENTS_PAGE_SIZE }, signal })
  return data
}

export const createComment = (entityType: CommentEntity, entityId: string, body: string, idempotencyKey: string) =>
  httpClient.post('/comments', { entityType, entityId, body }, idempotent(idempotencyKey))

export const updateComment = (id: string, body: string) => httpClient.patch(`/comments/${id}`, { body })
export const deleteComment = (id: string) => httpClient.delete(`/comments/${id}`)
