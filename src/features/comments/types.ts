/** What a comment can be attached to. The backend only accepts these two. */
export type CommentEntity = 'deal' | 'ticket'

export type Comment = {
  id: string
  entityType: CommentEntity
  entityId: string
  /** null when the author's account was removed. */
  authorId: string | null
  authorName: string | null
  /** Plain text. A mention is stored as `@[Full Name](user:<uuid>)`. */
  body: string
  mentions: string[]
  editedAt: string | null
  createdAt: string
}

// The same permission keys the backend checks (comments.service.ts): comments are staff-only notes on the deal or ticket.
export const commentPermissions = {
  read: { deal: 'deals.view', ticket: 'tickets.view' },
  write: { deal: 'deals.update', ticket: 'tickets.reply' },
} as const

export const MAX_COMMENT_LENGTH = 5000
