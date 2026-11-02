import { LogOut } from 'lucide-react'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { usePortalLogout, usePortalMe } from '../hooks/usePortal'

const links = [
  { to: '/portal', label: 'Home', end: true },
  { to: '/portal/orders', label: 'My orders' },
  { to: '/portal/invoices', label: 'My invoices' },
  { to: '/portal/support', label: 'Support' },
  { to: '/portal/appointments', label: 'Appointments' },
  { to: '/portal/documents', label: 'Documents' },
  { to: '/portal/notices', label: 'News' },
  { to: '/portal/profile', label: 'My details' },
]

// A separate, customer-facing shell: no staff sidebar, no CRM links.
export function PortalLayout() {
  const { data: customer } = usePortalMe()
  const logout = usePortalLogout()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!(await confirmDialog('You will need to sign in again to continue.', { title: 'Sign out?', confirmLabel: 'Sign out', tone: 'primary' }))) return
    logout.mutate(undefined, { onSuccess: () => navigate('/portal/login', { replace: true }) })
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-4 md:p-6">
      <header className="card mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div>
          <p className="font-semibold text-heading">{customer?.organizationName}</p>
          <p className="text-xs text-muted">Customer portal</p>
        </div>
        <nav aria-label="Portal" className="order-last -mx-2 flex w-full items-center gap-1 overflow-x-auto px-2 md:order-none md:mx-0 md:w-auto md:overflow-visible md:px-0">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link}
              className={({ isActive }) => cn('shrink-0 rounded-xl px-3 py-2 text-sm',isActive ? 'bg-primary-soft font-semibold text-primary' : 'text-body hover:bg-background')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <NavLink to="/portal/password" className="hidden text-muted hover:text-heading sm:inline">{customer?.name}</NavLink>
          <button type="button" onClick={handleLogout} disabled={logout.isPending} aria-label="Sign out" className="rounded-lg p-2 text-muted hover:text-destructive disabled:opacity-60">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
