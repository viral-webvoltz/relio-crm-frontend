import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '@/components/ui/Pagination'
import { useTagContacts } from '../hooks/useTags'
import type { Tag } from '../types'
import { TagChip } from './TagChip'

// Who has this tag, ten at a time, each linking to the contact.
export function TagContactsDialog({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error, refetch } = useTagContacts(tag.id, page)
  useEffect(() => dialog.current?.showModal(), [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tag-contacts-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="tag-contacts-title" className="text-lg font-semibold text-heading">Contacts tagged <TagChip tag={tag} /></h2>
          <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-background"><X className="size-4" aria-hidden /></button>
        </div>
        {isPending ? (
          <p className="py-4 text-sm text-muted">Loading…</p>
        ) : isError ? (
          <p role="alert" className="py-2 text-sm text-destructive">{error.message} <button type="button" className="link-action" onClick={() => refetch()}>Try again</button></p>
        ) : data.data.length === 0 ? (
          <p className="py-4 text-sm text-muted">No contacts have this tag.</p>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {data.data.map((c) => (
                <li key={c.id}>
                  <Link to={`/contacts/${c.id}/edit`} className="block min-h-11 py-2 hover:text-primary">
                    <span className="font-medium text-heading">{[c.firstName, c.lastName].filter(Boolean).join(' ')}</span>
                    {c.email && <span className="block text-xs text-muted">{c.email}</span>}
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </dialog>
  )
}
