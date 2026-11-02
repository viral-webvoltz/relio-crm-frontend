import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { confirmDialog } from '@/components/ui/ConfirmHost'

// Warns before in-app navigation or a tab close/refresh would throw away edits.
// Call allowLeave() only once the backend confirmed the save; a failed save keeps the guard active.
export function useUnsavedGuard(when: boolean) {
  const saved = useRef(false)
  const blocker = useBlocker(() => when && !saved.current)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirmDialog('You have unsaved changes. Leave without saving?', { title: 'Discard changes?', confirmLabel: 'Leave' }).then((leave) =>
      leave ? blocker.proceed() : blocker.reset(),
    )
  }, [blocker])

  useEffect(() => {
    if (!when) return
    const warn = (event: BeforeUnloadEvent) => {
      if (!saved.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [when])

  return { allowLeave: () => { saved.current = true } }
}
