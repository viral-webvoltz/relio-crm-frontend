import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useNavigation } from 'react-router-dom'

// Thin bar under the top edge while anything loads or saves, so slow actions never look frozen.
export function TopProgress() {
  const navigating = useNavigation().state !== 'idle'
  const busy = useIsFetching() + useIsMutating() > 0 || navigating
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      {busy && <div className="h-full w-1/3 animate-[progress_1.1s_ease-in-out_infinite] bg-primary" />}
    </div>
  )
}
