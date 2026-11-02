import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Check, Pencil, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { httpClient, type ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import { cn } from '@/lib/utils'

export type ViewResource = 'leads' | 'contacts' | 'companies' | 'deals' | 'tasks' | 'orders' | 'products' | 'invoices' | 'tickets'
type ViewQuery = { filters?: Record<string, string>; sort?: string; dir?: 'asc' | 'desc' }
type View = { id: string; name: string; query: ViewQuery; isShared: boolean; isOwner: boolean }

// Page, page size and calendar position are not part of what a view remembers.
const NOT_SAVED = new Set(['page', 'limit', 'sort', 'dir', 'month'])

const toQuery = (params: URLSearchParams): ViewQuery => {
  const filters: Record<string, string> = {}
  params.forEach((value, key) => {
    if (!NOT_SAVED.has(key) && value) filters[key] = value
  })
  const sort = params.get('sort')
  return { filters, ...(sort && { sort, dir: params.get('dir') === 'desc' ? 'desc' : 'asc' }) }
}
const fingerprint = (q: ViewQuery) => JSON.stringify([Object.entries(q.filters ?? {}).sort(), q.sort ?? '', q.sort ? (q.dir ?? 'asc') : ''])

// "Views" menu for a list: apply, save, rename, share and delete named filter + sort combinations.
// A view only stores filters and sort, so deleting one never touches any data.
export function SavedViews({ resource }: { resource: ViewResource }) {
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const key = ['saved-views', resource] as const
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const createKey = useIdempotencyKey()
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)

  const views = useQuery<View[], ApiError>({
    queryKey: key,
    queryFn: async ({ signal }) => (await httpClient.get<{ data: View[] }>('/saved-views', { params: { resource }, signal })).data.data,
    staleTime: 60_000,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const fail = (e: ApiError) => toast.error(e.message)

  const create = useMutation<unknown, ApiError, void>({
    mutationFn: () => httpClient.post('/saved-views', { resource, name: name.trim(), query: toQuery(params), isShared: shared }, { headers: { 'Idempotency-Key': createKey } }),
    onSuccess: () => {
      toast.success('View saved')
      setName('')
      setShared(false)
      return refresh()
    },
    onError: fail,
  })
  const update = useMutation<unknown, ApiError, { id: string; changes: { name?: string; isShared?: boolean } }>({
    mutationFn: ({ id, changes }) => httpClient.patch(`/saved-views/${id}`, changes),
    onSuccess: refresh,
    onError: fail,
  })
  const remove = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => httpClient.delete(`/saved-views/${id}`),
    onSuccess: () => {
      toast.success('View deleted')
      return refresh()
    },
    onError: fail,
  })

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const apply = (view: View) => {
    const next = new URLSearchParams()
    Object.entries(view.query.filters ?? {}).forEach(([k, v]) => next.set(k, String(v)))
    if (view.query.sort) {
      next.set('sort', view.query.sort)
      next.set('dir', view.query.dir ?? 'asc')
    }
    // Keep the user's page size and (for tasks) the list/calendar choice.
    for (const keep of ['limit', 'view']) {
      const value = params.get(keep)
      if (value) next.set(keep, value)
    }
    setParams(next)
    setOpen(false)
  }

  const currentFingerprint = fingerprint(toQuery(params))
  const canSave = name.trim().length > 0 && !create.isPending

  const rename = async (view: View) => {
    const next = await promptDialog('Choose a new name for this view.', { title: 'Rename view', inputLabel: 'Name', confirmLabel: 'Rename' })
    if (next?.trim()) update.mutate({ id: view.id, changes: { name: next.trim() } })
  }
  const askDelete = async (view: View) => {
    if (await confirmDialog(`Delete the view "${view.name}"? Your records are not affected.`, { title: 'Delete view?' })) remove.mutate(view.id)
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        e.stopPropagation()
        setOpen(false)
        button.current?.focus()
      }}
    >
      <button ref={button} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="btn-ghost h-10 gap-1.5">
        <Bookmark className="size-4" aria-hidden /> Views
      </button>
      {open && (
        <div role="dialog" aria-label="Saved views" className="absolute right-0 z-40 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-3 shadow-xl">
          {views.isPending ? (
            <p className="px-2 py-4 text-sm text-muted">Loading…</p>
          ) : views.isError ? (
            <p role="alert" className="px-2 py-3 text-sm text-destructive">
              {views.error.message}{' '}
              <button type="button" className="link-action" onClick={() => views.refetch()}>Retry</button>
            </p>
          ) : views.data.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">No saved views yet. Set up filters and sorting, then save them below.</p>
          ) : (
            <ul className="max-h-60 space-y-0.5 overflow-y-auto">
              {views.data.map((view) => {
                const active = fingerprint(view.query) === currentFingerprint
                return (
                  <li key={view.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => apply(view)}
                      aria-current={active || undefined}
                      className={cn('flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-primary-soft', active ? 'font-semibold text-primary' : 'text-heading')}
                    >
                      {active ? <Check className="size-4 shrink-0" aria-hidden /> : <span className="size-4 shrink-0" aria-hidden />}
                      <span className="truncate">{view.name}</span>
                      {view.isShared && <span className="rounded-full bg-background px-1.5 text-[10px] font-medium text-muted ring-1 ring-border">{view.isOwner ? 'Shared' : 'Team'}</span>}
                    </button>
                    {view.isOwner && (
                      <>
                        <button
                          type="button"
                          aria-label={view.isShared ? `Stop sharing ${view.name}` : `Share ${view.name} with the team`}
                          aria-pressed={view.isShared}
                          title={view.isShared ? 'Shared with the team' : 'Share with the team'}
                          onClick={() => update.mutate({ id: view.id, changes: { isShared: !view.isShared } })}
                          className={cn('grid size-9 place-items-center rounded-lg hover:bg-background', view.isShared ? 'text-primary' : 'text-muted')}
                        >
                          <Share2 className="size-4" aria-hidden />
                        </button>
                        <button type="button" aria-label={`Rename ${view.name}`} onClick={() => rename(view)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading">
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button type="button" aria-label={`Delete ${view.name}`} onClick={() => askDelete(view)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <form
            className="mt-3 space-y-2 border-t border-border/60 pt-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSave) create.mutate()
            }}
          >
            <label className="block text-xs font-medium text-heading" htmlFor={`view-name-${resource}`}>Save the current filters and sort as a view</label>
            <input id={`view-name-${resource}`} className="input-base" placeholder="e.g. Hot leads this week" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" className="size-4 accent-primary" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with the team (read-only for others)
            </label>
            <button type="submit" disabled={!canSave} className="btn-primary h-9 w-full">{create.isPending ? 'Saving…' : 'Save view'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
