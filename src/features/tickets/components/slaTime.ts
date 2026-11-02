import { formatDistanceStrict, parseISO } from 'date-fns'
import { useSyncExternalStore } from 'react'
import type { SlaState } from '../types'

// One shared minute ticker for the whole page (a list has dozens of rows), started with the first subscriber and stopped with the last.
let now = Date.now()
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) clearInterval(timer)
  }
}

/** Current time, refreshed every minute, so "due in 20 minutes" stays true without re-fetching. */
export const useNow = () => useSyncExternalStore(subscribe, () => now)

// The server's state is correct when it was fetched; once a deadline passes while the page is open, it turns overdue here.
export const liveState = (state: SlaState, dueAt: string, now: number): SlaState => ((state === 'ok' || state === 'warning') && now > parseISO(dueAt).getTime() ? 'breached' : state)

/** "in 3 hours" or "2 days overdue". */
export function dueText(dueAt: string, now: number) {
  const due = parseISO(dueAt)
  const distance = formatDistanceStrict(due, now)
  return now > due.getTime() ? `${distance} overdue` : `in ${distance}`
}

export const minutesLabel = (minutes: number) => {
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}
