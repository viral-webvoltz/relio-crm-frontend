import { differenceInCalendarDays, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/utils'
import type { ReportRange } from '../types'

const MAX_DAYS = 365 * 5 - 1 // the server rejects ranges of five years or more
const day = (d: Date) => format(d, 'yyyy-MM-dd')

// Reports work in whole months, so the presets are month based. "Last 12 months" is the server's own default window.
const presets = [
  { key: '12m', label: 'Last 12 months', range: (): ReportRange => ({}) },
  { key: '6m', label: 'Last 6 months', range: () => ({ from: day(startOfMonth(subMonths(new Date(), 5))), to: day(new Date()) }) },
  { key: '3m', label: 'Last 3 months', range: () => ({ from: day(startOfMonth(subMonths(new Date(), 2))), to: day(new Date()) }) },
  { key: 'year', label: 'This year', range: () => ({ from: day(startOfYear(new Date())), to: day(new Date()) }) },
] as const

// Presets plus a custom range. The range lives in the URL (owned by the parent), so it survives reloads and can be shared.
export function ReportRangePicker({ value, onChange }: { value: ReportRange; onChange: (range: ReportRange) => void }) {
  const activeKey = presets.find((p) => {
    const r = p.range()
    return (r.from ?? '') === (value.from ?? '') && (r.to ?? '') === (value.to ?? '')
  })?.key
  const isCustom = !activeKey
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: value.from ?? '', to: value.to ?? day(new Date()) })
  const showForm = open || isCustom

  const problem = (() => {
    if (!draft.from || !draft.to) return 'Choose both dates.'
    if (draft.from > draft.to) return '"From" must not be after "To".'
    if (differenceInCalendarDays(parseISO(draft.to), parseISO(draft.from)) > MAX_DAYS) return 'Pick a range shorter than 5 years.'
    return ''
  })()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={activeKey === p.key}
            onClick={() => {
              setOpen(false)
              onChange(p.range())
            }}
            className={cn('btn-ghost h-11', activeKey === p.key && 'border-primary bg-primary-soft text-primary')}
          >
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={isCustom} aria-expanded={showForm} onClick={() => setOpen((o) => !o)} className={cn('btn-ghost h-11', isCustom && 'border-primary bg-primary-soft text-primary')}>
          Custom
        </button>
      </div>
      {showForm && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!problem) onChange({ from: draft.from, to: draft.to })
          }}
        >
          <div className="text-sm text-muted">
            <span className="mb-1 block font-medium text-heading">From</span>
            <DatePicker className="w-44" aria-label="From date" value={draft.from} max={draft.to || undefined} clearable={false} onChange={(from) => setDraft({ ...draft, from })} />
          </div>
          <div className="text-sm text-muted">
            <span className="mb-1 block font-medium text-heading">To</span>
            <DatePicker className="w-44" aria-label="To date" value={draft.to} min={draft.from || undefined} clearable={false} onChange={(to) => setDraft({ ...draft, to })} />
          </div>
          <Button type="submit" disabled={Boolean(problem)}>Apply</Button>
          {problem && <p role="alert" className="pb-2 text-sm text-destructive">{problem}</p>}
        </form>
      )}
    </div>
  )
}
