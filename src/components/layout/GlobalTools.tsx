import { useQueries, useQuery } from '@tanstack/react-query'
import { Briefcase, Building2, CheckSquare, FileText, Keyboard, Package, Plus, Search, ShoppingCart, Target, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatInvoiceNumber } from '@/features/invoices/types'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { httpClient } from '@/lib/httpClient'
import { cn } from '@/lib/utils'

type Item = { id: string; label: string; hint?: string; to: string; group: string; icon?: LucideIcon }
type Row = Record<string, string | number | null | undefined>
type Hit = { id: string; title: string; subtitle: string | null }

// Contacts, companies, leads and deals come from the one GET /search request (ranked, 5 each). The other record types
// are not in /search yet, so they are still looked up through their own list endpoint.
type Source = { key: string; group: string; icon: LucideIcon; permission: string; to: (id: string) => string } & (
  | { search: true }
  | { search?: false; label: (r: Row) => string; hint: (r: Row) => string }
)

const sources: readonly Source[] = [
  { key: 'contacts', group: 'Contacts', icon: Users, permission: 'contacts.view', search: true, to: (id: string) => `/contacts/${id}/edit` },
  { key: 'companies', group: 'Companies', icon: Building2, permission: 'companies.view', search: true, to: (id: string) => `/companies/${id}/edit` },
  { key: 'leads', group: 'Leads', icon: Target, permission: 'leads.view', search: true, to: (id: string) => `/leads/${id}/edit` },
  { key: 'deals', group: 'Deals', icon: Briefcase, permission: 'deals.view', search: true, to: (id: string) => `/deals/${id}/edit` },
  { key: 'tasks', group: 'Tasks', icon: CheckSquare, permission: 'tasks.view', label: (r: Row) => String(r.title), hint: (r: Row) => String(r.dueDate ?? ''), to: (id: string) => `/tasks/${id}/edit` },
  { key: 'orders', group: 'Orders', icon: ShoppingCart, permission: 'orders.view', label: (r: Row) => `Order #${r.orderNumber}`, hint: (r: Row) => String(r.customerName ?? ''), to: (id: string) => `/orders/${id}` },
  { key: 'invoices', group: 'Invoices', icon: FileText, permission: 'invoices.view', label: (r: Row) => formatInvoiceNumber(Number(r.invoiceNumber)), hint: (r: Row) => String(r.customerName ?? ''), to: (id: string) => `/invoices/${id}` },
  { key: 'products', group: 'Products', icon: Package, permission: 'products.view', label: (r: Row) => String(r.name), hint: (r: Row) => String(r.sku ?? ''), to: (id: string) => `/products/${id}/edit` },
]

export const createActions = [
  { label: 'New lead', to: '/leads/new', permission: 'leads.create' },
  { label: 'New contact', to: '/contacts/new', permission: 'contacts.create' },
  { label: 'New company', to: '/companies/new', permission: 'companies.create' },
  { label: 'New deal', to: '/deals/new', permission: 'deals.create' },
  { label: 'New task', to: '/tasks/new', permission: 'tasks.create' },
  { label: 'New order', to: '/orders/new', permission: 'orders.create' },
  { label: 'New product', to: '/products/new', permission: 'products.create' },
  { label: 'New support ticket', to: '/support/new', permission: 'tickets.create' },
] as const

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)))
}

function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const q = useDebounced(text.trim())
  const can = (permission: string) => user?.permissions.includes(permission) ?? false

  const allowed = sources.filter((s) => can(s.permission))
  const searchable = allowed.filter((s) => s.search).map((s) => s.key)
  const listed = allowed.filter((s) => !s.search)
  const searching = q.length >= 2

  const unified = useQuery({
    queryKey: ['palette', 'search', q, searchable.join(',')],
    enabled: searching && searchable.length > 0,
    staleTime: 30_000,
    queryFn: async ({ signal }) => (await httpClient.get<{ data: Record<string, Hit[]> }>('/search', { params: { q, types: searchable.join(','), limit: 5 }, signal })).data.data,
  })
  const others = useQueries({
    queries: listed.map((s) => ({
      queryKey: ['palette', s.key, q],
      enabled: searching,
      staleTime: 30_000,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { data } = await httpClient.get<{ data: Row[] }>(`/${s.key}`, { params: { page: 1, limit: 5, search: q }, signal })
        return data.data
      },
    })),
  })

  const items: Item[] = searching
    ? allowed.flatMap((s): Item[] => {
        const base = { group: s.group, icon: s.icon }
        if (s.search) return (unified.data?.[s.key] ?? []).map((h) => ({ ...base, id: `${s.key}-${h.id}`, label: h.title, hint: h.subtitle ?? undefined, to: s.to(h.id) }))
        const rows = others[listed.indexOf(s)]?.data ?? []
        return rows.map((r) => ({ ...base, id: `${s.key}-${r.id}`, label: s.label(r), hint: s.hint(r), to: s.to(String(r.id)) }))
      })
    : createActions.filter((a) => can(a.permission)).map((a) => ({ id: a.to, label: a.label, to: a.to, group: 'Create' }))
  const loading = searching && (unified.isFetching || others.some((r) => r.isFetching) || q !== text.trim())
  const failed = searching && (unified.isError || others.some((r) => r.isError))

  const go = (item: Item) => {
    onClose()
    navigate(item.to)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length) setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length)
    } else if (event.key === 'Enter') {
      const item = items[Math.min(active, items.length - 1)]
      if (item) go(item)
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 rounded-t-2xl border-b border-border px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary">
        <Search className="size-4 text-muted" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={items.length ? `palette-${Math.min(active, items.length - 1)}` : undefined}
          aria-label="Search records or jump to an action"
          placeholder="Search contacts, leads, orders…"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
          }}
          className="h-14 flex-1 bg-transparent text-sm text-heading outline-none! placeholder:text-muted"
        />
        <kbd className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
      </div>
      <ul id="palette-list" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
        {items.map((item, index) => {
          const header = item.group !== items[index - 1]?.group
          return (
            <li key={item.id} role="presentation">
              {header && (
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {item.icon && <item.icon className="size-3.5" aria-hidden />}
                  {item.group}
                </p>
              )}
              <div
                id={`palette-${index}`}
                role="option"
                aria-selected={index === active}
                onClick={() => go(item)}
                onPointerMove={() => setActive(index)}
                className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm', index === active && 'bg-primary-soft text-primary')}
              >
                <span className="truncate font-medium">{item.label}</span>
                {item.hint && <span className="truncate text-xs text-muted">{item.hint}</span>}
              </div>
            </li>
          )
        })}
      </ul>
      <p role="status" aria-live="polite" className="border-t border-border px-4 py-2 text-xs text-muted">
        {failed ? 'Some results could not be loaded. Try again.' : loading ? 'Searching…' : searching && items.length === 0 ? `No records match “${q}”.` : !searching ? 'Type at least 2 letters to search, or pick an action.' : `${items.length} result${items.length === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}

const shortcuts = [
  ['Ctrl / ⌘ + K', 'Search everything and jump to a record'],
  ['/', 'Focus the search box on a list'],
  ['?', 'Show this help'],
  ['Esc', 'Close a dialog, menu or search'],
  ['↑ ↓ Enter', 'Move and choose in search and dropdown lists'],
  ['Space', 'Tick a table row or checkbox'],
] as const

// Header tools: record search (Ctrl/⌘+K), "+ New" menu and the shortcut cheat-sheet (?).
export function GlobalTools() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const palette = useRef<HTMLDialogElement>(null)
  const help = useRef<HTMLDialogElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const openPalette = () => {
    setPaletteOpen(true)
    palette.current?.showModal()
  }

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openPalette()
      } else if (event.key === '?' && !isTyping(event.target) && !document.querySelector('dialog[open]')) {
        help.current?.showModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => !menu.current?.contains(event.target as Node) && setMenuOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  const creates = createActions.filter((a) => user?.permissions.includes(a.permission))

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={openPalette} className="btn-ghost min-h-11 gap-2 text-muted" aria-label="Search records (Ctrl+K)">
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded-md border border-border px-1.5 text-xs lg:inline">Ctrl K</kbd>
      </button>
      {creates.length > 0 && (
        <div ref={menu} className="relative" onKeyDown={(e) => {
          if (e.key !== 'Escape' || !menuOpen) return
          e.stopPropagation()
          setMenuOpen(false)
          menuButton.current?.focus()
        }}>
          <button ref={menuButton} type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="btn-primary min-h-11 gap-1.5">
            <Plus className="size-4" aria-hidden /> New
          </button>
          {menuOpen && (
            <ul role="menu" aria-label="Create new" className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
              {creates.map((a, i) => (
                <li key={a.to} role="none">
                  <button
                    role="menuitem"
                    type="button"
                    autoFocus={i === 0}
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-heading hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft"
                    onKeyDown={(e) => {
                      const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
                      const at = items.indexOf(e.currentTarget)
                      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
                      if (step) {
                        e.preventDefault()
                        items[(at + step + items.length) % items.length]?.focus()
                      }
                    }}
                    onClick={() => {
                      setMenuOpen(false)
                      navigate(a.to)
                    }}
                  >
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <NotificationBell />
      <button type="button" onClick={() => help.current?.showModal()} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading" aria-label="Keyboard shortcuts">
        <Keyboard className="size-5" aria-hidden />
      </button>

      <dialog
        ref={palette}
        aria-label="Search"
        onClose={() => setPaletteOpen(false)}
        onClick={(event) => event.target === palette.current && palette.current?.close()}
        className="m-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {paletteOpen && <Palette onClose={() => palette.current?.close()} />}
      </dialog>

      <dialog
        ref={help}
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.target === help.current && help.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-4 p-6">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-heading">Keyboard shortcuts</h2>
          <dl className="space-y-2 text-sm">
            {shortcuts.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-4">
                <dt><kbd className="rounded-md border border-border px-2 py-0.5 text-xs text-heading">{keys}</kbd></dt>
                <dd className="text-right text-body">{what}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => help.current?.close()}>Got it</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
