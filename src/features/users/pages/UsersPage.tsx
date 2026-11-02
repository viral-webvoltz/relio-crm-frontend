import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useUsers } from '../hooks/useUsers'
import type { User } from '../types'

const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    primary: true,
    cell: (user) => (
      <div className="flex items-center gap-3">
        <Avatar name={user.fullName} />
        <div className="min-w-0">
          <div className="font-medium text-heading">{user.fullName}</div>
          <div className="truncate text-xs text-muted">{user.email}</div>
        </div>
      </div>
    ),
  },
  { key: 'roles', header: 'Roles', cell: (user) => user.roles.map((r) => r.name).join(', ') },
  { key: 'status', header: 'Status', cell: (user) => <StatusBadge domain="active" status={user.isActive ? 'active' : 'inactive'} /> },
]

export function UsersPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useUsers()

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage who has access to your workspace."
        actions={
          <Link to="/settings/users/new" className="btn-primary">
            <Plus className="size-4" aria-hidden /> New user
          </Link>
        }
      />
      <DataTable
        caption="Users"
        columns={columns}
        rows={data}
        rowKey={(user) => user.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No users yet.', hint: 'Use the button above to invite your first teammate.' }}
        actions={(user) => <Link to={`/settings/users/${user.id}/edit`} className="link-action">Edit</Link>}
      />
    </>
  )
}
