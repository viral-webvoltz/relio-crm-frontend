import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}

// Tells people their connection dropped; forms keep their input and lists keep showing the last loaded data.
export function NetworkBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <div role="alert" className="mb-3 flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You're offline. Your changes are kept on screen — reconnect and try again.
    </div>
  )
}
