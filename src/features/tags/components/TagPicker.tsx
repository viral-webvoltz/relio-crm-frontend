import { Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from '@/components/ui/FieldParts'
import { cn } from '@/lib/utils'
import { useCreateTag, useTags } from '../hooks/useTags'
import { MAX_TAGS_PER_CONTACT, tagColors, type Tag } from '../types'
import { TagChip } from './TagChip'

type Props = { label?: string; value: string[]; onChange: (ids: string[]) => void; error?: string; hint?: string }

type Option = { kind: 'tag'; tag: Tag } | { kind: 'create'; name: string }

// Multi-select with search. Typing a name that does not exist offers to create it, so people never leave the form to add a tag.
export function TagPicker({ label = 'Tags', value, onChange, error, hint }: Props) {
  const ids = useFieldIds()
  const listId = useId()
  const root = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const tags = useTags()
  const create = useCreateTag()

  const all = tags.data ?? []
  const selected = value.map((id) => all.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t))
  const query = text.trim().toLowerCase()
  const full = value.length >= MAX_TAGS_PER_CONTACT
  const options: Option[] = [
    ...all.filter((t) => !value.includes(t.id) && t.name.toLowerCase().includes(query)).map((tag): Option => ({ kind: 'tag', tag })),
    ...(query && !all.some((t) => t.name.toLowerCase() === query) ? [{ kind: 'create', name: text.trim() } as Option] : []),
  ]

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [open])

  const add = (id: string) => {
    onChange([...value, id])
    setText('')
    setActive(0)
  }
  const pick = (option: Option | undefined) => {
    if (!option || full) return
    if (option.kind === 'tag') return add(option.tag.id)
    if (create.isPending) return
    // Created with the first palette colour; recolour it under Settings → Tags.
    create.mutate({ name: option.name, color: tagColors[0].value }, { onSuccess: (tag) => add(tag.id), onError: (e) => toast.error(e.message) })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (options.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault() // don't submit the surrounding form
        pick(options[active])
      } else if (!text) return
      else e.preventDefault()
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
  }

  const showList = open && !full && (options.length > 0 || tags.isPending)
  const activeId = showList && options[active] ? `${listId}-${active}` : undefined

  return (
    <div ref={root} className="space-y-1.5">
      <FieldLabel id={ids.id} label={label} />
      {selected.length > 0 && (
        <ul aria-label="Selected tags" className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <li key={tag.id}><TagChip tag={tag} onRemove={() => onChange(value.filter((id) => id !== tag.id))} /></li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          id={ids.id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, full ? 'full' : hint, error)}
          autoComplete="off"
          disabled={full}
          maxLength={40}
          className="input-base"
          placeholder={full ? `Up to ${MAX_TAGS_PER_CONTACT} tags` : 'Search or add a tag'}
          value={text}
          onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {showList && (
          <ul id={listId} role="listbox" aria-label="Tags" className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl">
            {tags.isPending && <li className="px-3 py-2 text-sm text-muted">Loading…</li>}
            {options.map((option, i) => (
              <li
                key={option.kind === 'tag' ? option.tag.id : 'create'}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={option.kind === 'create' && create.isPending ? true : undefined}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => pick(option)}
                onMouseEnter={() => setActive(i)}
                className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm', i === active && 'bg-primary-soft')}
              >
                {option.kind === 'tag' ? (
                  <TagChip tag={option.tag} />
                ) : (
                  <span className="flex items-center gap-2 text-heading"><Plus className="size-4 text-primary" aria-hidden /> {create.isPending ? 'Creating…' : <>Create “{option.name}”</>}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <FieldMessages {...ids} hint={full ? `A contact can have up to ${MAX_TAGS_PER_CONTACT} tags.` : hint} error={error} />
    </div>
  )
}
