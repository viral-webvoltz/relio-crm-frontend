import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'

const labels: Record<string, string> = {
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  activity: 'Activity',
  categories: 'Categories',
  audit: 'Audit log',
  notices: 'Customer notices',
  deliveries: 'Deliveries',
  workflows: 'Workflows',
  'email-templates': 'Email templates',
  tags: 'Tags',
  'api-keys': 'API keys',
  privacy: 'Privacy and data',
  account: 'Account & security',
  teams: 'Teams',
  assignment: 'Assignment rules',
  sla: 'Response targets',
  suppressions: 'Do-not-email list',
  'custom-fields': 'Custom fields',
}
// Resources that have a /:id detail page, so their id crumb can be a link.
const hasDetailPage = new Set(['orders', 'invoices', 'quotes', 'subscriptions'])
const isId = (segment: string) => /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(segment)
const titleCase = (segment: string) => labels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)

// Built from the URL so every nested page gets one without per-route setup.
export function Breadcrumbs() {
  const segments = useLocation().pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const crumbs = segments.map((segment, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/')
    const last = i === segments.length - 1
    const linkable = !last && segment !== 'settings' && (!isId(segment) || hasDetailPage.has(segments[i - 1] ?? ''))
    return { label: isId(segment) ? 'Details' : titleCase(segment), path, last, linkable }
  })

  return (
    <nav aria-label="Breadcrumb" className="mb-3 px-1 md:px-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <li>
          <Link to="/" aria-label="Dashboard" className="inline-flex rounded-md p-1 hover:text-heading">
            <Home className="size-4" aria-hidden />
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.path}>
            <li aria-hidden className="flex">
              <ChevronRight className="size-4" />
            </li>
            <li>
              {crumb.linkable ? (
                <Link to={crumb.path} className="rounded-md px-1 py-0.5 hover:text-heading hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={crumb.last ? 'page' : undefined} className={crumb.last ? 'px-1 font-medium text-heading' : 'px-1'}>
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
