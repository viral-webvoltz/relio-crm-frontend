import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'

function FullPageMessage({ children }: { children: string }) {
  return <div className="flex min-h-screen items-center justify-center text-muted">{children}</div>
}

// UX only: the backend enforces authentication on every API call.
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser()
  if (isPending) return <FullPageMessage>Loading…</FullPageMessage>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser()
  if (isPending) return <FullPageMessage>Loading…</FullPageMessage>
  return user ? <Navigate to="/" replace /> : <Outlet />
}
