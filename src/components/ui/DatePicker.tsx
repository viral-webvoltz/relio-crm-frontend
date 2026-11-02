import { addDays, addMonths, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isValid, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  /** "yyyy-MM-dd", or "" for no date. */
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  /** Hide the clear button for required dates. */
  clearable?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  triggerRef?: Ref<HTMLButtonElement>
}

const ISO = 'yyyy-MM-dd'
const parse = (value?: string) => {
  const date = value ? parseISO(value) : null
  return date && isValid(date) ? startOfDay(date) : null
}
const WEEK = { weekStartsOn: 1 } as const // weeks start on Monday
const weekdays = Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(new Date(), WEEK), i), 'EEEEEE'))

type Placement = { top: number; left: number; up: boolean }

// Calendar popup that replaces the browser's native date control: same look everywhere, keyboard and screen-reader friendly.
export function DatePicker({ value, onChange, min, max, disabled, placeholder = 'Pick a date', clearable = true, id, className, triggerRef, ...aria }: DatePickerProps) {
  const selected = parse(value)
  const minDate = parse(min)
  const maxDate = parse(max)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
  const [focused, setFocused] = useState<Date>(() => selected ?? startOfDay(new Date()))
  const [place, setPlace] = useState<Placement | null>(null)
  const button = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  const blocked = (date: Date) => Boolean((minDate && isBefore(date, minDate)) || (maxDate && isAfter(date, maxDate)))

  const show = () => {
    if (disabled || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const up = window.innerHeight - rect.bottom < 340 && rect.top > window.innerHeight - rect.bottom
    setPlace({ top: up ? rect.top : rect.bottom, left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), up })
    const start = selected ?? startOfDay(new Date())
    setMonth(startOfMonth(start))
    setFocused(start)
    setOpen(true)
  }
  const hide = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const pick = (date: Date) => {
    if (blocked(date)) return
    onChange(format(date, ISO))
    hide()
  }

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!button.current?.contains(target) && !panel.current?.contains(target)) setOpen(false)
    }
    const away = (event: Event) => !panel.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', away)
    window.addEventListener('scroll', away, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', away)
      window.removeEventListener('scroll', away, true)
    }
  }, [open])

  // Keep real keyboard focus on the focused day so arrow keys and screen readers follow it.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>(`[data-day="${format(focused, ISO)}"]`)?.focus()
  }, [open, focused, month])

  const moveFocus = (next: Date) => {
    setFocused(next)
    setMonth(startOfMonth(next))
  }

  const onGridKeyDown = (event: KeyboardEvent) => {
    const steps: Record<string, Date> = {
      ArrowLeft: addDays(focused, -1),
      ArrowRight: addDays(focused, 1),
      ArrowUp: addDays(focused, -7),
      ArrowDown: addDays(focused, 7),
      PageUp: addMonths(focused, -1),
      PageDown: addMonths(focused, 1),
      Home: startOfWeek(focused, WEEK),
      End: endOfWeek(focused, WEEK),
    }
    const next = steps[event.key]
    if (next) {
      event.preventDefault()
      moveFocus(next)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation() // don't also close a dialog the picker lives in
      hide()
    }
  }

  const days = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(startOfMonth(month), WEEK), i))
  const today = startOfDay(new Date())

  return (
    <>
      <div className="relative">
        <button
          {...aria}
          ref={(el) => {
            button.current = el
            if (typeof triggerRef === 'function') triggerRef(el)
            else if (triggerRef) (triggerRef as { current: HTMLButtonElement | null }).current = el
          }}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => (open ? hide(false) : show())}
          className={cn('input-base flex items-center justify-between gap-2 text-left aria-invalid:border-destructive disabled:bg-background disabled:text-muted', clearable && selected && 'pr-16', className)}
        >
          <span className={cn('truncate', !selected && 'text-muted')}>{selected ? format(selected, 'd MMM yyyy') : placeholder}</span>
          <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
        {clearable && selected && !disabled && (
          <button type="button" aria-label="Clear date" onClick={() => onChange('')} className="absolute right-9 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-heading">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {open && place && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a date"
          style={{ position: 'fixed', left: place.left, ...(place.up ? { bottom: window.innerHeight - place.top + 4 } : { top: place.top + 4 }) }}
          className="z-[60] w-72 rounded-2xl border border-border bg-surface p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => moveFocus(addMonths(focused, -1))} className="grid size-9 place-items-center rounded-lg text-body hover:bg-primary-soft">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-heading" aria-live="polite">{format(month, 'MMMM yyyy')}</p>
            <button type="button" aria-label="Next month" onClick={() => moveFocus(addMonths(focused, 1))} className="grid size-9 place-items-center rounded-lg text-body hover:bg-primary-soft">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div role="grid" aria-label={format(month, 'MMMM yyyy')} onKeyDown={onGridKeyDown}>
            <div role="row" className="grid grid-cols-7 text-center text-xs font-medium text-muted">
              {weekdays.map((d) => <span key={d} role="columnheader" className="py-1.5">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day) => {
                const iso = format(day, ISO)
                const isSelected = selected ? isSameDay(day, selected) : false
                const off = blocked(day)
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    data-day={iso}
                    tabIndex={isSameDay(day, focused) ? 0 : -1}
                    disabled={off}
                    aria-selected={isSelected}
                    aria-current={isSameDay(day, today) ? 'date' : undefined}
                    aria-label={format(day, 'EEEE d MMMM yyyy')}
                    onClick={() => pick(day)}
                    className={cn(
                      'mx-auto grid size-9 place-items-center rounded-full text-sm transition',
                      isSameMonth(day, month) ? 'text-heading' : 'text-muted/60',
                      !isSelected && !off && 'hover:bg-primary-soft',
                      isSameDay(day, today) && !isSelected && 'font-semibold text-primary ring-1 ring-primary/40',
                      isSelected && 'bg-primary font-semibold text-white',
                      off && 'opacity-35',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
            <button type="button" onClick={() => !blocked(today) && pick(today)} disabled={blocked(today)} className="link-action">Today</button>
            {clearable && <button type="button" onClick={() => { onChange(''); hide() }} className="link-action">Clear</button>}
          </div>
        </div>
      )}
    </>
  )
}
