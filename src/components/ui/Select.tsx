import { Check, ChevronDown } from 'lucide-react'
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Option = { value: string; label: string; disabled?: boolean }

// Reads <option> children, so a Select is a drop-in for <select> and pages keep writing options the same way.
function toOptions(children: ReactNode): Option[] {
  const out: Option[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const element = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>
    if (element.type === Fragment) return void out.push(...toOptions(element.props.children))
    const label = Children.toArray(element.props.children).join('')
    out.push({ value: String(element.props.value ?? label), label, disabled: element.props.disabled })
  })
  return out
}

type SelectProps = {
  value: string | number
  /** Called like a native select: `e.target.value`. */
  onChange?: (event: { target: { value: string } }) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  triggerRef?: React.Ref<HTMLButtonElement>
}

type Placement = { top: number; left: number; width: number; maxHeight: number; up: boolean }

// Styled listbox that replaces the browser's native dropdown: same look everywhere, keyboard and screen-reader friendly.
export function Select({ value, onChange, children, className, disabled, id, triggerRef, ...aria }: SelectProps) {
  const listId = useId()
  const options = toOptions(children)
  const current = String(value)
  const selectedIndex = options.findIndex((o) => o.value === current)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<Placement | null>(null)
  const button = useRef<HTMLButtonElement | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })

  const show = () => {
    if (disabled || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 8
    const up = below < 180 && rect.top > below
    setPlace({ top: up ? rect.top : rect.bottom, left: rect.left, width: rect.width, maxHeight: Math.min(288, (up ? rect.top : below) - 8), up })
    setActive(Math.max(selectedIndex, 0))
    setOpen(true)
  }
  const hide = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    if (option.value !== current) onChange?.({ target: { value: option.value } })
    hide()
  }

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!button.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    const away = (event: Event) => !list.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', away)
    window.addEventListener('scroll', away, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', away)
      window.removeEventListener('scroll', away, true)
    }
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const move = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + step * i + options.length) % options.length
      if (!options[next]?.disabled) return next
    }
    return from
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled) return
    const { key } = event
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault()
        show()
      }
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => move(i, key === 'ArrowDown' ? 1 : -1))
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      setActive(key === 'Home' ? move(-1, 1) : move(options.length, -1))
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      choose(active)
    } else if (key === 'Escape') {
      event.preventDefault()
      event.stopPropagation() // don't also close a dialog the select lives in
      hide()
    } else if (key === 'Tab') {
      setOpen(false)
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
      // Type-ahead: jump to the option starting with what was typed.
      const now = Date.now()
      typed.current = { text: (now - typed.current.at > 600 ? '' : typed.current.text) + key.toLowerCase(), at: now }
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text))
      if (hit >= 0) setActive(hit)
    }
  }

  const label = options[selectedIndex]?.label ?? ''

  return (
    <>
      <button
        {...aria}
        ref={(el) => {
          button.current = el
          if (typeof triggerRef === 'function') triggerRef(el)
          else if (triggerRef) (triggerRef as { current: HTMLButtonElement | null }).current = el
        }}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? hide(false) : show())}
        onKeyDown={onKeyDown}
        className={cn('input-base flex items-center justify-between gap-2 text-left aria-invalid:border-destructive disabled:bg-background disabled:text-muted', className)}
      >
        <span className={cn('truncate', !label && 'text-muted')}>{label || 'Select…'}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && place && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={aria['aria-label']}
          style={{ position: 'fixed', left: place.left, minWidth: place.width, maxHeight: place.maxHeight, ...(place.up ? { bottom: window.innerHeight - place.top + 4 } : { top: place.top + 4 }) }}
          className="z-[60] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              aria-disabled={option.disabled || undefined}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(index)}
              onPointerMove={() => !option.disabled && setActive(index)}
              className={cn(
                'flex min-h-9 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 text-sm text-heading',
                className?.includes('capitalize') && 'capitalize',
                index === active && 'bg-primary-soft text-primary',
                option.disabled && 'text-muted',
              )}
            >
              <span>{option.label}</span>
              {index === selectedIndex && <Check className="size-4 shrink-0" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
