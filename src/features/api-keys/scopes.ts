// Scopes are permission keys like "contacts.view". People see them as "Contacts: view" grouped by area.
const areaLabel: Record<string, string> = {
  activities: 'Notes and calls',
  appointments: 'Appointments',
  campaigns: 'Email campaigns',
  companies: 'Companies',
  contacts: 'Contacts',
  customers: 'Customer portal accounts',
  deals: 'Deals',
  documents: 'Documents',
  goals: 'Goals',
  invoices: 'Invoices',
  leads: 'Leads',
  orders: 'Orders',
  portal: 'Customer portal',
  products: 'Products',
  quotes: 'Quotes',
  reports: 'Reports',
  roles: 'Roles',
  subscriptions: 'Subscriptions',
  tasks: 'Tasks',
  tickets: 'Support tickets',
  users: 'Users',
}

const actionLabel: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
  send: 'Send',
  convert: 'Convert',
  reply: 'Reply',
  stock: 'Adjust stock',
  manage: 'Manage',
}

const humanize = (value: string) => value.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

export const scopeArea = (scope: string) => scope.split('.')[0] ?? scope
export const areaName = (area: string) => areaLabel[area] ?? humanize(area)
export const scopeName = (scope: string) => {
  const [, action = scope] = scope.split('.')
  return actionLabel[action] ?? humanize(action)
}
/** "Contacts: view" — used where a scope stands alone, like a key's summary. */
export const scopeFullName = (scope: string) => `${areaName(scopeArea(scope))}: ${scopeName(scope).toLowerCase()}`

/** Scopes grouped by area, areas in alphabetical order, actions in the order the API gave them. */
export function groupScopes(scopes: readonly string[]) {
  const groups = new Map<string, string[]>()
  for (const scope of scopes) groups.set(scopeArea(scope), [...(groups.get(scopeArea(scope)) ?? []), scope])
  return [...groups.entries()].map(([area, items]) => ({ area, label: areaName(area), scopes: items })).sort((a, b) => a.label.localeCompare(b.label))
}
