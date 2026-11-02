import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/ui/Skeleton'
import { httpClient, type ApiError } from '@/lib/httpClient'
import { cn } from '@/lib/utils'

type Notification = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }
type Page = { data: Notification[]; unreadCount: number }

const key = ['notifications'] as const

// The API only ever sends in-app paths; anything else is ignored rather than followed.
const safeLink = (link: string | null) => (link && link.startsWith('/') && !link.startsWith('//') ? link : null)

export function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  const { data, isPending, isError, error, refetch } = useQuery<Page, ApiError>({
    queryKey: key,
    queryFn: async ({ signal }) => (await httpClient.get<Page>('/notifications', { params: { limit: 20 }, signal })).data,
    refetchInterval: 60_000, // pauses while the tab is hidden
    staleTime: 30_000,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const markRead = useMutation({ mutationFn: (id: string) => httpClient.post(`/notifications/${id}/read`), onSuccess: refresh })
  const markAll = useMutation({ mutationFn: () => httpClient.post('/notifications/read-all'), onSuccess: refresh })

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const unread = data?.unreadCount ?? 0

  const openItem = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id)
    setOpen(false)
    const link = safeLink(n.link)
    if (link) navigate(link)
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
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h2 className="text-sm font-semibold text-heading">Notifications</h2>
            <button type="button" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()} className="link-action gap-1">
              <CheckCheck className="size-3.5" aria-hidden /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isPending ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
            ) : isError ? (
              <ErrorState message={error.message} onRetry={() => refetch()} />
            ) : data.data.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.data.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-background', !n.readAt && 'bg-primary-soft/50')}>
                      <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-heading">
                          {!n.readAt && <span className="sr-only">Unread: </span>}
                          {n.title}
                        </span>
                        {n.body && <span className="mt-0.5 block text-sm text-body">{n.body}</span>}
                        <span className="mt-1 block text-xs text-muted">{formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
