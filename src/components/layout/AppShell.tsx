import { BarChart3, Building2, CalendarClock, CircleDollarSign, FileSignature, FileText, Fingerprint, History, KeyRound, LayoutDashboard, LifeBuoy, ListChecks, ListPlus, LogOut, MailPlus, Megaphone, Menu, Package, PanelLeftClose, PanelLeftOpen, Repeat, ScrollText, Send, ShieldCheck, ShoppingCart, Shuffle, Tags, Target, Timer, Trash2, Trophy, UserCog, Users, UsersRound, Webhook, Workflow, X } from 'lucide-react'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '@/app/config/brand'
import { BrandMark } from '@/components/ui/BrandMark'
import { Avatar } from '@/components/ui/Avatar'
import { useCurrentUser, useLogout } from '@/features/auth/hooks/useAuth'
import { usePreferences, useSetPreference } from '@/lib/usePreferences'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from './Breadcrumbs'
import { GlobalTools } from './GlobalTools'
import { NetworkBanner } from './NetworkBanner'
import { NoAccess } from './NoAccess'
import { TopProgress } from './TopProgress'

// Only real routes are listed; add an entry as each module ships.
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: null, group: 'Workspace' },
  { to: '/leads', label: 'Leads', icon: Target, end: false, permission: 'leads.view', group: 'Sales' },
  { to: '/deals', label: 'Deals', icon: CircleDollarSign, end: false, permission: 'deals.view', group: 'Sales' },
  { to: '/goals', label: 'Goals', icon: Trophy, end: false, permission: 'goals.view', group: 'Sales' },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, end: false, permission: 'tasks.view', group: 'Workspace' },
  { to: '/activity', label: 'Activity', icon: History, end: false, permission: 'activities.view', group: 'Workspace' },
  { to: '/contacts', label: 'Contacts', icon: Users, end: false, permission: 'contacts.view', group: 'Sales' },
  { to: '/companies', label: 'Companies', icon: Building2, end: false, permission: 'companies.view', group: 'Sales' },
  { to: '/support', label: 'Support', icon: LifeBuoy, end: false, permission: 'tickets.view', group: 'Support' },
  { to: '/quotes', label: 'Quotes', icon: FileSignature, end: false, permission: 'quotes.view', group: 'Sales' },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat, end: false, permission: 'subscriptions.view', group: 'Sales' },
  { to: '/campaigns', label: 'Campaigns', icon: Send, end: false, permission: 'campaigns.view', group: 'Sales' },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, end: false, permission: 'orders.view', group: 'Sales' },
  { to: '/invoices', label: 'Invoices', icon: FileText, end: false, permission: 'invoices.view', group: 'Sales' },
  { to: '/products', label: 'Products', icon: Package, end: false, permission: 'products.view', group: 'Sales' },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock, end: false, permission: 'portal.manage', group: 'Support' },
  { to: '/trash', label: 'Trash', icon: Trash2, end: false, permission: 'leads.delete', group: 'Workspace' },
  { to: '/reports', label: 'Reports', icon: BarChart3, end: false, permission: null, group: 'Workspace' },
  { to: '/settings/organization', label: 'Organization', icon: Building2, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/users', label: 'Users', icon: UserCog, end: false, permission: 'users.manage', group: 'Settings' },
  { to: '/settings/roles', label: 'Roles', icon: ShieldCheck, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/notices', label: 'Customer notices', icon: Megaphone, end: false, permission: 'portal.manage', group: 'Settings' },
  { to: '/settings/email-templates', label: 'Email templates', icon: MailPlus, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/sla', label: 'Response targets', icon: Timer, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/teams', label: 'Teams', icon: UsersRound, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/assignment', label: 'Assignment rules', icon: Shuffle, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/api-keys', label: 'API keys', icon: KeyRound, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/privacy', label: 'Privacy and data', icon: Fingerprint, end: false, permission: 'privacy.manage', group: 'Settings' },
  { to: '/settings/tags', label: 'Tags', icon: Tags, end: false, permission: 'contacts.update', group: 'Settings' },
  { to: '/settings/custom-fields', label: 'Custom fields', icon: ListPlus, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/workflows', label: 'Workflows', icon: Workflow, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/webhooks', label: 'Webhooks', icon: Webhook, end: false, permission: 'settings.manage', group: 'Settings' },
  { to: '/settings/audit', label: 'Audit log', icon: ScrollText, end: false, permission: 'settings.manage', group: 'Settings' },
]

// UX only (the API still answers 403): a direct URL to an area the role can't see shows a friendly page, not a broken list.
function GuardedOutlet() {
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const area = navItems.find((item) => item.permission && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
  return area?.permission && !user?.permissions.includes(area.permission) ? <NoAccess /> : <Outlet />
}

const COLLAPSE_KEY = 'crm.sidebarCollapsed'
// localStorage gives an instant first paint; the server preference (follows the user across devices) wins once loaded.
function readCollapsed() {
  try {
    const saved = localStorage.getItem(COLLAPSE_KEY)
    if (saved !== null) return saved === '1'
  } catch {
    /* storage blocked: fall through to the viewport default */
  }
  return window.matchMedia('(max-width: 1023px)').matches // tablets start collapsed
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex min-h-11 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition',
    isActive ? 'bg-primary-soft font-semibold text-primary' : 'text-body hover:bg-background hover:text-heading',
  )

// The logo is the "home" link: it goes to the dashboard from every layout (sidebar, drawer, mobile header).
function Logo({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} aria-label={`${BRAND.name} — go to dashboard`} title="Dashboard" className="flex items-center gap-3 rounded-xl">
      <BrandMark className="size-10 shrink-0 shadow-[0_8px_18px_-6px_rgb(32_87_222/0.7)]" />
      {!collapsed && <span className="text-xl font-semibold tracking-tight text-heading">{BRAND.name}</span>}
    </Link>
  )
}

type SidebarProps = { collapsed: boolean; onLogout: () => void; loggingOut: boolean }

// One nav used by the desktop sidebar and the mobile drawer. Collapsed keeps accessible names via sr-only text + title.
function SidebarContent({ collapsed, onLogout, loggingOut }: SidebarProps) {
  const { data: user } = useCurrentUser()
  const visible = navItems.filter((item) => !item.permission || user?.permissions.includes(item.permission))
  const groups = [...new Set(visible.map((item) => item.group))]

  return (
    <>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden">
        {groups.map((group) => (
          <div key={group}>
            {collapsed ? (
              <hr className="mx-3 mb-2 border-border" />
            ) : (
              <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted">{group}</p>
            )}
            <div className="space-y-1">
              {visible.filter((item) => item.group === group).map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-4 h-6 w-1 rounded-r-full bg-primary" aria-hidden />}
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('mt-4 flex items-center gap-3 rounded-xl bg-background p-3', collapsed && 'flex-col')}>
        <Link to="/account" aria-label="Account and security" title="Account & security" className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80', collapsed && 'flex-none')}>
          <Avatar name={user?.fullName ?? ''} className="size-10" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-heading">{user?.fullName}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
              {user?.organization && <p className="truncate text-xs font-medium text-primary" title={`Organization: ${user.organization.name}`}>{user.organization.name}</p>}
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
          className="flex size-11 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-destructive disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </>
  )
}

export function AppShell() {
  const logout = useLogout()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const drawer = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  const handleLogout = async () => {
    if (!(await confirmDialog('You will need to sign in again to continue.', { title: 'Sign out?', confirmLabel: 'Sign out', tone: 'primary' }))) return
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  }
  const sidebar = { onLogout: handleLogout, loggingOut: logout.isPending }

  const { data: prefs } = usePreferences()
  const setPreference = useSetPreference()
  const [syncedServer, setSyncedServer] = useState(false)
  // Adopt the saved server value once, when it first arrives.
  if (prefs && !syncedServer) {
    setSyncedServer(true)
    if (typeof prefs.sidebarCollapsed === 'boolean' && prefs.sidebarCollapsed !== collapsed) setCollapsed(prefs.sidebarCollapsed)
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    } catch {
      /* preference just won't persist locally */
    }
    setPreference.mutate({ name: 'sidebarCollapsed', value: next })
  }

  // After navigating: close the mobile drawer and move keyboard/screen-reader focus to the new content.
  useEffect(() => {
    drawer.current?.close()
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen gap-4 p-3 md:p-4">
      <TopProgress />
      <a href="#main" className="sr-only rounded-xl bg-surface px-4 py-2 font-medium text-primary shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
        Skip to content
      </a>

      <aside className={cn('card sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col p-4 transition-[width] md:flex', collapsed ? 'w-[5.5rem]' : 'w-64')}>
        <div className={cn('flex pb-6 pt-1', collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between px-2')}>
          <Logo collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="flex size-11 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-heading"
          >
            {collapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
          </button>
        </div>
        <SidebarContent collapsed={collapsed} {...sidebar} />
      </aside>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClick={(event) => event.target === drawer.current && drawer.current?.close()}
        className="m-0 mr-auto h-dvh max-h-none w-72 max-w-[85vw] flex-col rounded-r-2xl bg-surface p-4 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm open:flex"
      >
        <div className="flex items-center justify-between px-2 pb-4">
          <Logo onNavigate={() => drawer.current?.close()} />
          <button type="button" aria-label="Close menu" onClick={() => drawer.current?.close()} className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-background">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <SidebarContent collapsed={false} {...sidebar} />
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="card mb-4 flex items-center gap-3 p-2 md:hidden">
          <button type="button" aria-label="Open menu" onClick={() => drawer.current?.showModal()} className="flex size-11 items-center justify-center rounded-lg text-heading hover:bg-background">
            <Menu className="size-5" aria-hidden />
          </button>
          <Logo />
        </header>
        <div className="flex flex-wrap items-center justify-between gap-2 md:pr-4">
          <div className="min-w-0"><Breadcrumbs /></div>
          <div className="mb-3 ml-auto"><GlobalTools /></div>
        </div>
        <NetworkBanner />
        <main id="main" ref={main} tabIndex={-1} className="flex-1 px-1 py-2 outline-none md:px-4 md:py-3">
          <GuardedOutlet />
        </main>
      </div>
    </div>
  )
}
