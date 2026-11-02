import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from './FieldParts'

export type ComboOption = { id: string; label: string }

type Props = {
  label: string
  value: string
  onChange: (id: string) => void
  /** Server-side search. Receives the AbortSignal so a stale request is cancelled. */
  fetchOptions: (query: string, signal: AbortSignal) => Promise<ComboOption[]>
  /** Resolves the label of the current value when it isn't in the loaded results. */
  fetchOne?: (id: string, signal: AbortSignal) => Promise<ComboOption>
  /** Cache namespace, e.g. "companies". */
  scope: string
  emptyLabel?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
}

function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

// ARIA 1.2 combobox with a listbox popup: arrows move, Enter picks, Esc closes, typing searches the server.
export function Combobox({ label, value, onChange, fetchOptions, fetchOne, scope, emptyLabel = 'None', placeholder = 'Search…', error, hint, required }: Props) {
  const ids = useFieldIds()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const query = useDebounced(open ? text : '')
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const options = useQuery({ queryKey: ['combobox', scope, query], queryFn: ({ signal }) => fetchOptions(query, signal), enabled: open, staleTime: 30_000 })
  const selected = useQuery({
    queryKey: ['combobox', scope, 'one', value],
    queryFn: ({ signal }) => fetchOne!(value, signal),
    enabled: Boolean(value && fetchOne),
    staleTime: 60_000,
  })
  const current = options.data?.find((o) => o.id === value) ?? selected.data
  const list = options.data ?? []
  const choices = [{ id: '', label: emptyLabel }, ...list]

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setText('')
    input.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return setOpen(true)
      setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const choice = choices[active]
      if (choice) pick(choice.id)
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  const status = options.isError ? 'Could not load results.' : options.isFetching ? 'Searching…' : `${list.length} result${list.length === 1 ? '' : 's'}`

  return (
    <div className="space-y-1.5" ref={root}>
      <FieldLabel id={ids.id} label={label} required={required} />
      <div className="relative">
        <input
          ref={input}
          id={ids.id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          autoComplete="off"
          className="input-base pr-16 aria-invalid:border-destructive"
          placeholder={open ? placeholder : (current?.label ?? emptyLabel)}
          value={open ? text : (current?.label ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {value && (
            <button type="button" aria-label={`Clear ${label}`} onClick={() => pick('')} className="rounded-lg p-1 text-muted hover:text-heading">
              <X className="size-4" aria-hidden />
            </button>
          )}
          <ChevronsUpDown className="size-4 text-muted" aria-hidden />
        </div>
        {open && (
          <ul id={listId} role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
            {choices.map((choice, index) => (
              <li
                key={choice.id || 'none'}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={choice.id === value}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(choice.id)}
                onPointerMove={() => setActive(index)}
                className={cn('flex min-h-9 cursor-pointer items-center justify-between rounded-lg px-3 text-sm', index === active && 'bg-primary-soft text-primary', !choice.id && 'text-muted')}
              >
                <span className="truncate">{choice.label}</span>
                {choice.id === value && <Check className="size-4" aria-hidden />}
              </li>
            ))}
            {!options.isFetching && !options.isError && list.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
          </ul>
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">{open ? status : ''}</span>
      <FieldMessages {...ids} hint={hint} error={error} />
    </div>
  )
}
