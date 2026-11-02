import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { AtSign, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState } from '@/components/ui/Skeleton'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useCan } from '@/features/auth/hooks/useCan'
import { useUserOptions } from '@/features/users/hooks/useUsers'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useAddComment, useComments, useDeleteComment, useEditComment } from '../hooks/useComments'
import { commentPermissions, MAX_COMMENT_LENGTH, type Comment, type CommentEntity } from '../types'

export type CommentsPanelProps = {
  entity: CommentEntity
  entityId: string
  /** Heading text; defaults to "Comments". */
  title?: string
}

type Person = { id: string; fullName: string }

// `@[Full Name](user:<uuid>)` is how the backend stores a mention; people only ever see "@Full Name".
const MENTION = /@\[([^\]]*)\]\(user:[0-9a-f-]{36}\)/gi

function CommentBody({ body }: { body: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of body.matchAll(MENTION)) {
    if (m.index > last) parts.push(body.slice(last, m.index))
    parts.push(<strong key={m.index} className="rounded bg-primary-soft px-1 font-medium text-primary">@{m[1]}</strong>)
    last = m.index + m[0].length
  }
  parts.push(body.slice(last))
  return <p className="whitespace-pre-wrap break-words text-sm text-body">{parts}</p>
}

const submitOnCtrlEnter = (e: KeyboardEvent, submit: () => void) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    submit()
  }
}

function Composer({ entity, entityId, people }: { entity: CommentEntity; entityId: string; people: Person[] }) {
  const add = useAddComment(entity, entityId)
  const area = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState('')
  // One key per comment being written: a double-click or a retry after a dropped connection posts it once. A new key starts after each success.
  const [key, setKey] = useState(() => crypto.randomUUID())
  useUnsavedGuard(body.trim().length > 0)

  const tooLong = body.length > MAX_COMMENT_LENGTH
  const blocked = !body.trim() || tooLong || add.isPending

  const submit = () => {
    if (blocked) return
    add.mutate(
      { body: body.trim(), key },
      {
        onSuccess: () => {
          toast.success('Comment added')
          setBody('')
          setKey(crypto.randomUUID())
          area.current?.focus()
        },
      },
    )
  }

  const mention = (id: string) => {
    const person = people.find((p) => p.id === id)
    if (!person) return
    const token = `@[${person.fullName.replace(/[[\]]/g, '')}](user:${id}) `
    const el = area.current
    const from = el?.selectionStart ?? body.length
    const to = el?.selectionEnd ?? from
    setBody(body.slice(0, from) + token + body.slice(to))
    el?.focus()
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-2 border-t border-border/60 pt-4"
    >
      <label htmlFor={`comment-${entityId}`} className="block text-sm font-medium text-heading">
        Add a comment <span className="text-destructive" aria-hidden>*</span>
      </label>
      <textarea
        id={`comment-${entityId}`}
        ref={area}
        rows={3}
        required
        aria-required="true"
        aria-invalid={tooLong || undefined}
        aria-describedby={`comment-hint-${entityId}`}
        className="input-base h-auto py-2.5"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => submitOnCtrlEnter(e, submit)}
      />
      <p id={`comment-hint-${entityId}`} className={tooLong ? 'text-xs text-destructive' : 'text-xs text-muted'}>
        {tooLong ? `Too long by ${body.length - MAX_COMMENT_LENGTH} characters.` : 'Only your team sees comments. Press Ctrl+Enter to send.'}
      </p>
      {add.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{add.error.message} Your comment is still here, so you can try again.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={add.isPending} disabled={blocked}>{add.isPending ? 'Sending…' : 'Send comment'}</Button>
        {people.length > 0 && (
          <Select aria-label="Mention a teammate" value="" onChange={(e) => mention(e.target.value)} className="w-auto">
            <option value="">@ Mention…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </Select>
        )}
      </div>
    </form>
  )
}

function CommentItem({ comment, entity, entityId, meId, canManage }: { comment: Comment; entity: CommentEntity; entityId: string; meId?: string; canManage: boolean }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.body)
  const edit = useEditComment(entity, entityId)
  const remove = useDeleteComment(entity, entityId)
  useUnsavedGuard(editing && text !== comment.body)

  // Mirrors the server: only the author edits; the author or an admin deletes.
  const own = Boolean(meId) && comment.authorId === meId
  const canDelete = own || canManage
  const created = parseISO(comment.createdAt)
  const blocked = !text.trim() || text.length > MAX_COMMENT_LENGTH || edit.isPending

  const save = () => {
    if (blocked) return
    if (text.trim() === comment.body) return setEditing(false)
    edit.mutate({ id: comment.id, body: text.trim() }, { onSuccess: () => { toast.success('Comment updated'); setEditing(false) } })
  }

  const handleDelete = async () => {
    if (!(await confirmDialog('Delete this comment? It disappears for everyone on your team.', { title: 'Delete comment?', confirmLabel: 'Delete comment' }))) return
    remove.mutate(comment.id, { onSuccess: () => toast.success('Comment deleted'), onError: (e) => toast.error(e.message) })
  }

  return (
    <li className="rounded-xl border border-border/70 bg-surface p-4">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
        <span className="font-medium text-heading">{comment.authorName ?? 'Former team member'}</span>
        <time dateTime={comment.createdAt} title={format(created, 'EEEE d MMMM yyyy, HH:mm:ss')}>
          {format(created, 'd MMM yyyy, HH:mm')} ({formatDistanceToNow(created, { addSuffix: true })})
        </time>
        {comment.editedAt && <span title={format(parseISO(comment.editedAt), 'd MMM yyyy, HH:mm')}>· edited</span>}
      </div>
      {editing ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="space-y-2"
        >
          <label htmlFor={`edit-${comment.id}`} className="sr-only">Edit comment</label>
          <textarea
            id={`edit-${comment.id}`}
            rows={3}
            autoFocus
            className="input-base h-auto py-2.5"
            value={text}
            aria-invalid={text.length > MAX_COMMENT_LENGTH || undefined}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => submitOnCtrlEnter(e, save)}
          />
          {edit.error && <p role="alert" className="text-sm text-destructive">{edit.error.message}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={edit.isPending} disabled={blocked}>Save</Button>
            <Button type="button" variant="ghost" onClick={() => { setText(comment.body); setEditing(false) }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <>
          <CommentBody body={comment.body} />
          {(own || canDelete) && (
            <div className="mt-2 flex items-center gap-4 text-sm">
              {own && (
                <button type="button" className="link-action gap-1" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </button>
              )}
              {canDelete && (
                <button type="button" className="link-danger gap-1" disabled={remove.isPending} onClick={handleDelete}>
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </button>
              )}
            </div>
          )}
        </>
      )}
    </li>
  )
}

// Internal team comments on a deal or a support ticket. Renders nothing for users who may not view the record.
export function CommentsPanel({ entity, entityId, title = 'Comments' }: CommentsPanelProps) {
  const { data: me } = useCurrentUser()
  const canRead = useCan(commentPermissions.read[entity])
  const canWrite = useCan(commentPermissions.write[entity])
  const canManage = useCan('settings.manage')
  const people = useUserOptions(canWrite)
  const query = useComments(entity, entityId, canRead)
  if (!canRead) return null

  const comments = query.data?.pages.flatMap((p) => p.data) ?? []
  const total = query.data?.pages.at(-1)?.meta.total ?? 0

  return (
    <section aria-labelledby={`comments-title-${entityId}`} className="card space-y-4 p-6">
      <h2 id={`comments-title-${entityId}`} className="flex items-center gap-2 text-base font-semibold text-heading">
        <MessageSquare className="size-4 text-primary" aria-hidden /> {title}
        {total > 0 && <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">{total}</span>}
      </h2>

      {query.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading comments">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-background" />)}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : comments.length === 0 ? (
        <EmptyState icon={AtSign} title="No comments yet" hint={canWrite ? 'Start the conversation. Use @ to mention a teammate.' : undefined} />
      ) : (
        <>
          {/* Polite live region: screen readers hear a new comment without losing their place. */}
          <ol aria-live="polite" aria-relevant="additions" className="space-y-3">
            {comments.map((c) => <CommentItem key={c.id} comment={c} entity={entity} entityId={entityId} meId={me?.id} canManage={canManage} />)}
          </ol>
          {query.hasNextPage && (
            <Button type="button" variant="ghost" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              Show more comments ({total - comments.length} left)
            </Button>
          )}
        </>
      )}

      {canWrite ? <Composer entity={entity} entityId={entityId} people={people.data ?? []} /> : <p className="border-t border-border/60 pt-4 text-sm text-muted">You can read comments here but your role cannot add them.</p>}
    </section>
  )
}
