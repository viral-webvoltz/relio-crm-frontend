import { Navigate, Outlet } from 'react-router-dom'
import { AppLoader } from '@/components/ui/AppLoader'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'

// UX only: the backend enforces authentication on every API call.
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser()
  if (isPending) return <AppLoader />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser()
  if (isPending) return <AppLoader />
  return user ? <Navigate to="/" replace /> : <Outlet />
}
