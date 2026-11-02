import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useDeleteRole, useRoles } from '../hooks/useRoles'
import type { Role } from '../types'

export function RolesPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useRoles()
  const deleteRole = useDeleteRole()

  const handleDelete = async (role: Role) => {
    if (!(await confirmDialog(`Delete the role "${role.name}"?`))) return
    deleteRole.mutate(role.id, { onSuccess: () => toast.success('Role deleted'), onError: (e) => toast.error(e.message) })
  }

  const totalPermissions = data?.allPermissions.length ?? 0
  const columns: Column<Role>[] = [
    {
      key: 'role',
      header: 'Role',
      primary: true,
      cell: (role) => (
        <span className="flex flex-wrap items-center gap-2 font-medium text-heading">
          {role.name} {role.isSystem && <Badge tone="info">system</Badge>}
        </span>
      ),
    },
    { key: 'permissions', header: 'Permissions', cell: (role) => `${role.permissions.length} of ${totalPermissions}` },
    { key: 'users', header: 'Users', cell: (role) => role.userCount },
  ]

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Control what each role can see and do."
        actions={
          <Link to="/settings/roles/new" className="btn-primary">
            <Plus className="size-4" aria-hidden /> New role
          </Link>
        }
      />
      <DataTable
        caption="Roles"
        columns={columns}
        rows={data?.roles}
        rowKey={(role) => role.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No roles yet.', hint: 'Use the button above to create one.' }}
        actions={(role) =>
          role.isSystem ? (
            <span className="text-xs text-muted">Always has full access</span>
          ) : (
            <>
              <Link to={`/settings/roles/${role.id}/edit`} className="link-action">Edit</Link>
              <button type="button" className="link-danger" onClick={() => handleDelete(role)}>Delete</button>
            </>
          )
        }
      />
    </>
  )
}
