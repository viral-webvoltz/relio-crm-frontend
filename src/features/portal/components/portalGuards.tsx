import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { usePortalMe } from '../hooks/usePortal'

function Loading() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageSkeleton />
    </div>
  )
}

// UX only: the portal API checks the customer session on every request.
export function RequirePortalAuth() {
  const { data: customer, isPending } = usePortalMe()
  const { pathname } = useLocation()
  if (isPending) return <Loading />
  if (!customer) return <Navigate to="/portal/login" replace />
  // A password chosen by staff must be replaced first (the API enforces this too).
  if (customer.mustChangePassword && pathname !== '/portal/password') return <Navigate to="/portal/password" replace />
  return <Outlet />
}

export function PortalGuestOnly() {
  const { data: customer, isPending } = usePortalMe()
  if (isPending) return <Loading />
  return customer ? <Navigate to="/portal" replace /> : <Outlet />
}
