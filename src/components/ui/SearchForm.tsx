import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type SearchFormProps = { defaultValue: string; placeholder: string; onSearch: (value: string) => void }

// Searches as you type (debounced) and on Enter; follows the committed value when the URL changes elsewhere.
// Press "/" anywhere outside a field to jump here.
export function SearchForm({ defaultValue, placeholder, onSearch }: SearchFormProps) {
  const [value, setValue] = useState(defaultValue)
  const [seenDefault, setSeenDefault] = useState(defaultValue)
  const latest = useRef(onSearch)
  const input = useRef<HTMLInputElement>(null)

  // Follow the committed value when the URL changes elsewhere (adjusting state during render, not in an effect).
  if (seenDefault !== defaultValue) {
    setSeenDefault(defaultValue)
    setValue(defaultValue)
  }
  useEffect(() => {
    latest.current = onSearch
  })
  useEffect(() => {
    if (value.trim() === defaultValue) return
    const timer = setTimeout(() => latest.current(value.trim()), 350)
    return () => clearTimeout(timer)
  }, [value, defaultValue])
  useEffect(() => {
    const focusOnSlash = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')
      if (event.key !== '/' || typing || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', focusOnSlash)
    return () => window.removeEventListener('keydown', focusOnSlash)
  }, [])

  return (
    <form
      role="search"
      className="relative w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(value.trim())
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input ref={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} aria-keyshortcuts="/" className="input-base pl-10 pr-10" />
      {value ? (
        <button type="button" aria-label="Clear search" onClick={() => setValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-background hover:text-heading">
          <X className="size-4" aria-hidden />
        </button>
      ) : (
        <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-background px-1.5 text-xs text-muted">/</kbd>
      )}
    </form>
  )
}
