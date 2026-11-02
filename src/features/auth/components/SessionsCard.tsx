import { formatDistanceToNow, parseISO } from 'date-fns'
import { Laptop, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { ErrorState } from '@/components/ui/Skeleton'
import type { AuthSession } from '../api/authApi'
import { useRevokeOtherSessions, useRevokeSession, useSessions } from '../hooks/useAccount'

// "Chrome on Windows" from the browser's user-agent text; anything unrecognised is just "Unknown device".
function deviceName(ua: string | null) {
  if (!ua) return { label: 'Unknown device', mobile: false }
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null
  return { label: browser && os ? `${browser} on ${os}` : (browser ?? os ?? 'Unknown device'), mobile: /Android|iPhone|iPad|Mobile/.test(ua) }
}

function SessionRow({ session, others }: { session: AuthSession; others: boolean }) {
  const revoke = useRevokeSession()
  const { label, mobile } = deviceName(session.userAgent)
  const Icon = mobile ? Smartphone : Laptop
  const signOut = async () => {
    if (!(await confirmDialog(`Sign out ${label}${session.ipAddress ? ` (${session.ipAddress})` : ''}? Anyone using it will need to sign in again.`, { title: 'Sign out this device?', confirmLabel: 'Sign out' }))) return
    revoke.mutate(session.id, { onSuccess: () => toast.success('Device signed out'), onError: (e) => toast.error(e.message) })
  }
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Icon className="size-5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-heading">
          {label}
          {session.current && <Badge tone="success">This device</Badge>}
        </div>
        <div className="text-xs text-muted">
          {session.ipAddress ?? 'Unknown address'} · Last active {formatDistanceToNow(parseISO(session.lastSeenAt ?? session.createdAt), { addSuffix: true })}
        </div>
      </div>
      {!session.current && others && <Button variant="ghost" loading={revoke.isPending} onClick={signOut}>Sign out</Button>}
    </li>
  )
}

export function SessionsCard() {
  const sessions = useSessions()
  const revokeOthers = useRevokeOtherSessions()
  const others = sessions.data?.filter((s) => !s.current).length ?? 0

  const signOutAll = async () => {
    if (!(await confirmDialog('Sign out every other device? Each one will need to sign in again. This device stays signed in.', { title: 'Sign out other devices?', confirmLabel: 'Sign out all' }))) return
    revokeOthers.mutate(undefined, { onSuccess: (n) => toast.success(n === 1 ? '1 device signed out' : `${n} devices signed out`), onError: (e) => toast.error(e.message) })
  }

  return (
    <section className="card p-6" aria-labelledby="sessions-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sessions-heading" className="text-base font-semibold text-heading">Where you are signed in</h2>
          <p className="mt-1 text-sm text-muted">If you see a device you do not recognise, sign it out and change your password.</p>
        </div>
        {others > 0 && <Button variant="ghost" loading={revokeOthers.isPending} onClick={signOutAll}>Sign out all other devices</Button>}
      </div>
      {sessions.isPending ? (
        <p className="py-4 text-sm text-muted">Loading…</p>
      ) : sessions.isError ? (
        <ErrorState message={sessions.error.message} onRetry={() => sessions.refetch()} />
      ) : (
        <ul className="divide-y divide-border/60" aria-label="Signed-in devices">
          {sessions.data.map((s) => <SessionRow key={s.id} session={s} others={others > 0} />)}
        </ul>
      )}
    </section>
  )
}
