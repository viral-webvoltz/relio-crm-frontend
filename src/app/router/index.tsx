import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PortalLayout } from '@/features/portal/components/PortalLayout'
import { PortalGuestOnly, RequirePortalAuth } from '@/features/portal/components/portalGuards'
import { NotFound } from '@/components/layout/NotFound'
import { AppShell } from '@/components/layout/AppShell'
import { RouteError } from '@/components/layout/RouteError'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { GuestOnly, RequireAuth } from './routeGuards'

// Each page is its own chunk, loaded on first visit. A render failure shows RouteError inside the shell.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => ({
  lazy: async () => ({ Component: (await load())[name] }),
  errorElement: <RouteError />,
})

const Loading = () => (
  <div className="p-6">
    <PageSkeleton />
  </div>
)

export const router = createBrowserRouter([
  { path: '*', element: <NotFound /> },
  // Public pages opened from emailed links: no staff session, no app shell, no login redirect.
  // Password reset links work whether or not someone is signed in, so these sit outside GuestOnly.
  { path: '/forgot-password', ...page(() => import('@/features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
  { path: '/reset-password', ...page(() => import('@/features/auth/pages/ResetPasswordPage'), 'ResetPasswordPage') },
  { path: '/unsubscribe/:token', ...page(() => import('@/features/campaigns/pages/PublicUnsubscribePage'), 'PublicUnsubscribePage') },
  { path: '/quote/:token', ...page(() => import('@/features/quotes/pages/PublicQuotePage'), 'PublicQuotePage') },
  // Customer portal: its own layout, guards and session, completely separate from the staff app below.
  {
    element: <PortalGuestOnly />,
    HydrateFallback: Loading,
    children: [{ path: '/portal/login', ...page(() => import('@/features/portal/pages/PortalLoginPage'), 'PortalLoginPage') }],
  },
  {
    element: <RequirePortalAuth />,
    HydrateFallback: Loading,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { path: '/portal', ...page(() => import('@/features/portal/pages/PortalHomePage'), 'PortalHomePage') },
          { path: '/portal/notices', ...page(() => import('@/features/portal/pages/PortalNoticesPage'), 'PortalNoticesPage') },
          { path: '/portal/documents', ...page(() => import('@/features/portal/pages/PortalDocumentsPage'), 'PortalDocumentsPage') },
          { path: '/portal/appointments', ...page(() => import('@/features/portal/pages/PortalAppointmentsPage'), 'PortalAppointmentsPage') },
          { path: '/portal/profile', ...page(() => import('@/features/portal/pages/PortalProfilePage'), 'PortalProfilePage') },
          { path: '/portal/password', ...page(() => import('@/features/portal/pages/PortalChangePasswordPage'), 'PortalChangePasswordPage') },
          { path: '/portal/orders', ...page(() => import('@/features/portal/pages/PortalOrdersPage'), 'PortalOrdersPage') },
          { path: '/portal/orders/:id', ...page(() => import('@/features/portal/pages/PortalOrderPage'), 'PortalOrderPage') },
          { path: '/portal/support', ...page(() => import('@/features/portal/pages/PortalTicketsPage'), 'PortalTicketsPage') },
          { path: '/portal/support/new', ...page(() => import('@/features/portal/pages/PortalNewTicketPage'), 'PortalNewTicketPage') },
          { path: '/portal/support/:id', ...page(() => import('@/features/portal/pages/PortalTicketPage'), 'PortalTicketPage') },
          { path: '/portal/invoices', ...page(() => import('@/features/portal/pages/PortalInvoicesPage'), 'PortalInvoicesPage') },
          { path: '/portal/invoices/:id', ...page(() => import('@/features/portal/pages/PortalInvoicePage'), 'PortalInvoicePage') },
        ],
      },
    ],
  },
  {
    element: <GuestOnly />,
    HydrateFallback: Loading,
    children: [
      { path: '/login', ...page(() => import('@/features/auth/pages/LoginPage'), 'LoginPage') },
      { path: '/register', ...page(() => import('@/features/auth/pages/RegisterPage'), 'RegisterPage') },
    ],
  },
  {
    element: <RequireAuth />,
    HydrateFallback: Loading,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', ...page(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage') },
          { path: '/contacts', ...page(() => import('@/features/contacts/pages/ContactsPage'), 'ContactsPage') },
          { path: '/contacts/new', ...page(() => import('@/features/contacts/pages/ContactFormPage'), 'ContactFormPage') },
          { path: '/contacts/:id/edit', ...page(() => import('@/features/contacts/pages/ContactFormPage'), 'ContactFormPage') },
          { path: '/leads', ...page(() => import('@/features/leads/pages/LeadsPage'), 'LeadsPage') },
          { path: '/leads/new', ...page(() => import('@/features/leads/pages/LeadFormPage'), 'LeadFormPage') },
          { path: '/leads/:id/edit', ...page(() => import('@/features/leads/pages/LeadFormPage'), 'LeadFormPage') },
          { path: '/deals', ...page(() => import('@/features/deals/pages/DealsPage'), 'DealsPage') },
          { path: '/deals/new', ...page(() => import('@/features/deals/pages/DealFormPage'), 'DealFormPage') },
          { path: '/deals/:id/edit', ...page(() => import('@/features/deals/pages/DealFormPage'), 'DealFormPage') },
          { path: '/support', ...page(() => import('@/features/tickets/pages/TicketsPage'), 'TicketsPage') },
          { path: '/support/new', ...page(() => import('@/features/tickets/pages/TicketNewPage'), 'TicketNewPage') },
          { path: '/support/:id', ...page(() => import('@/features/tickets/pages/TicketDetailPage'), 'TicketDetailPage') },
          { path: '/invoices', ...page(() => import('@/features/invoices/pages/InvoicesPage'), 'InvoicesPage') },
          { path: '/invoices/:id', ...page(() => import('@/features/invoices/pages/InvoiceDetailPage'), 'InvoiceDetailPage') },
          { path: '/orders', ...page(() => import('@/features/orders/pages/OrdersPage'), 'OrdersPage') },
          { path: '/orders/new', ...page(() => import('@/features/orders/pages/OrderFormPage'), 'OrderFormPage') },
          { path: '/orders/:id', ...page(() => import('@/features/orders/pages/OrderDetailPage'), 'OrderDetailPage') },
          { path: '/products', ...page(() => import('@/features/products/pages/ProductsPage'), 'ProductsPage') },
          { path: '/products/new', ...page(() => import('@/features/products/pages/ProductFormPage'), 'ProductFormPage') },
          { path: '/products/categories', ...page(() => import('@/features/products/pages/ProductCategoriesPage'), 'ProductCategoriesPage') },
          { path: '/products/:id/edit', ...page(() => import('@/features/products/pages/ProductFormPage'), 'ProductFormPage') },
          { path: '/activity', ...page(() => import('@/features/activities/pages/ActivityFeedPage'), 'ActivityFeedPage') },
          { path: '/tasks', ...page(() => import('@/features/tasks/pages/TasksPage'), 'TasksPage') },
          { path: '/tasks/new', ...page(() => import('@/features/tasks/pages/TaskFormPage'), 'TaskFormPage') },
          { path: '/tasks/:id/edit', ...page(() => import('@/features/tasks/pages/TaskFormPage'), 'TaskFormPage') },
          { path: '/settings/organization', ...page(() => import('@/features/organization/pages/OrganizationPage'), 'OrganizationPage') },
          { path: '/settings/users', ...page(() => import('@/features/users/pages/UsersPage'), 'UsersPage') },
          { path: '/settings/users/new', ...page(() => import('@/features/users/pages/UserFormPage'), 'UserFormPage') },
          { path: '/settings/users/:id/edit', ...page(() => import('@/features/users/pages/UserFormPage'), 'UserFormPage') },
          { path: '/appointments', ...page(() => import('@/features/portal-admin/pages/AppointmentsInboxPage'), 'AppointmentsInboxPage') },
          { path: '/settings/notices', ...page(() => import('@/features/portal-admin/pages/NoticesAdminPage'), 'NoticesAdminPage') },
          { path: '/trash', ...page(() => import('@/features/trash/pages/TrashPage'), 'TrashPage') },
          { path: '/settings/audit', ...page(() => import('@/features/audit/pages/AuditLogPage'), 'AuditLogPage') },
          { path: '/quotes', ...page(() => import('@/features/quotes/pages/QuotesPage'), 'QuotesPage') },
          { path: '/quotes/new', ...page(() => import('@/features/quotes/pages/QuoteFormPage'), 'QuoteFormPage') },
          { path: '/quotes/:id', ...page(() => import('@/features/quotes/pages/QuoteDetailPage'), 'QuoteDetailPage') },
          { path: '/quotes/:id/edit', ...page(() => import('@/features/quotes/pages/QuoteFormPage'), 'QuoteFormPage') },
          { path: '/subscriptions', ...page(() => import('@/features/subscriptions/pages/SubscriptionsPage'), 'SubscriptionsPage') },
          { path: '/subscriptions/new', ...page(() => import('@/features/subscriptions/pages/SubscriptionFormPage'), 'SubscriptionFormPage') },
          { path: '/subscriptions/:id', ...page(() => import('@/features/subscriptions/pages/SubscriptionDetailPage'), 'SubscriptionDetailPage') },
          { path: '/subscriptions/:id/edit', ...page(() => import('@/features/subscriptions/pages/SubscriptionFormPage'), 'SubscriptionFormPage') },
          { path: '/account', ...page(() => import('@/features/auth/pages/AccountPage'), 'AccountPage') },
          { path: '/goals', ...page(() => import('@/features/goals/pages/GoalsPage'), 'GoalsPage') },
          { path: '/goals/new', ...page(() => import('@/features/goals/pages/GoalFormPage'), 'GoalFormPage') },
          { path: '/goals/:id/edit', ...page(() => import('@/features/goals/pages/GoalFormPage'), 'GoalFormPage') },
          { path: '/campaigns', ...page(() => import('@/features/campaigns/pages/CampaignsPage'), 'CampaignsPage') },
          { path: '/campaigns/new', ...page(() => import('@/features/campaigns/pages/CampaignFormPage'), 'CampaignFormPage') },
          { path: '/campaigns/suppressions', ...page(() => import('@/features/campaigns/pages/SuppressionsPage'), 'SuppressionsPage') },
          { path: '/campaigns/:id', ...page(() => import('@/features/campaigns/pages/CampaignDetailPage'), 'CampaignDetailPage') },
          { path: '/campaigns/:id/edit', ...page(() => import('@/features/campaigns/pages/CampaignFormPage'), 'CampaignFormPage') },
          { path: '/reports', ...page(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage') },
          { path: '/settings/email-templates', ...page(() => import('@/features/email-templates/pages/EmailTemplatesPage'), 'EmailTemplatesPage') },
          { path: '/settings/sla', ...page(() => import('@/features/tickets/pages/SlaPolicyPage'), 'SlaPolicyPage') },
          { path: '/settings/teams', ...page(() => import('@/features/teams/pages/TeamsPage'), 'TeamsPage') },
          { path: '/settings/assignment', ...page(() => import('@/features/assignment/pages/AssignmentRulesPage'), 'AssignmentRulesPage') },
          { path: '/settings/api-keys', ...page(() => import('@/features/api-keys/pages/ApiKeysPage'), 'ApiKeysPage') },
          { path: '/settings/privacy', ...page(() => import('@/features/privacy/pages/PrivacyPage'), 'PrivacyPage') },
          { path: '/settings/tags', ...page(() => import('@/features/tags/pages/TagsPage'), 'TagsPage') },
          { path: '/settings/custom-fields', ...page(() => import('@/features/custom-fields/pages/CustomFieldsPage'), 'CustomFieldsPage') },
          { path: '/settings/workflows', ...page(() => import('@/features/workflows/pages/WorkflowsPage'), 'WorkflowsPage') },
          { path: '/settings/workflows/new', ...page(() => import('@/features/workflows/pages/WorkflowEditorPage'), 'WorkflowEditorPage') },
          { path: '/settings/workflows/:id/edit', ...page(() => import('@/features/workflows/pages/WorkflowEditorPage'), 'WorkflowEditorPage') },
          { path: '/settings/webhooks', ...page(() => import('@/features/webhooks/pages/WebhooksPage'), 'WebhooksPage') },
          { path: '/settings/webhooks/new', ...page(() => import('@/features/webhooks/pages/WebhookFormPage'), 'WebhookFormPage') },
          { path: '/settings/webhooks/:id/edit', ...page(() => import('@/features/webhooks/pages/WebhookFormPage'), 'WebhookFormPage') },
          { path: '/settings/webhooks/:id/deliveries', ...page(() => import('@/features/webhooks/pages/WebhookDeliveriesPage'), 'WebhookDeliveriesPage') },
          { path: '/settings/roles', ...page(() => import('@/features/roles/pages/RolesPage'), 'RolesPage') },
          { path: '/settings/roles/new', ...page(() => import('@/features/roles/pages/RoleFormPage'), 'RoleFormPage') },
          { path: '/settings/roles/:id/edit', ...page(() => import('@/features/roles/pages/RoleFormPage'), 'RoleFormPage') },
          { path: '/companies', ...page(() => import('@/features/companies/pages/CompaniesPage'), 'CompaniesPage') },
          { path: '/companies/new', ...page(() => import('@/features/companies/pages/CompanyFormPage'), 'CompanyFormPage') },
          { path: '/companies/:id/edit', ...page(() => import('@/features/companies/pages/CompanyFormPage'), 'CompanyFormPage') },
        ],
      },
    ],
  },
])
