import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useUserOptions } from '@/features/users/hooks/useUsers'
import { TeamDialog } from '../components/TeamDialog'
import { useDeleteTeam, useTeams } from '../hooks/useTeams'
import type { Team } from '../types'

// Teams are groups of people that a rule can hand new leads or tickets to.
export function TeamsPage() {
  const teams = useTeams()
  const users = useUserOptions()
  const remove = useDeleteTeam()
  // undefined = closed, null = new team, a Team = editing it
  const [editing, setEditing] = useState<Team | null | undefined>(undefined)

  const handleDelete = async (team: Team) => {
    const ok = await confirmDialog(`Delete the team “${team.name}”? The people in it are not removed. If a rule hands items to this team, the delete is refused until you change that rule.`, { title: 'Delete team?', confirmLabel: 'Delete team' })
    if (!ok) return
    remove.mutate(team.id, { onSuccess: () => toast.success('Team deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      primary: true,
      cell: (team) => (
        <>
          <div className="font-medium text-heading">{team.name}</div>
          {team.description && <div className="mt-0.5 text-xs text-muted">{team.description}</div>}
        </>
      ),
    },
    { key: 'members', header: 'People', align: 'right', cell: (team) => (team.memberCount === 0 ? <span className="text-muted">No one yet</span> : team.memberCount) },
    { key: 'created', header: 'Created', cell: (team) => <span className="text-muted">{format(parseISO(team.createdAt), 'd MMM yyyy')}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Groups of people. An assignment rule can give new leads or tickets to a team, in turn or to whoever is least busy."
        actions={
          <button type="button" className="btn-primary" disabled={!users.data} onClick={() => setEditing(null)}>
            <Plus className="size-4" aria-hidden /> New team
          </button>
        }
      />
      <p className="mb-4 text-sm text-muted">
        Teams are used by <Link to="/settings/assignment" className="link-action">assignment rules</Link>.
      </p>
      <DataTable
        caption="Teams"
        columns={columns}
        rows={teams.data}
        rowKey={(team) => team.id}
        loading={teams.isPending}
        refreshing={teams.isFetching}
        error={teams.isError ? teams.error : null}
        onRetry={() => teams.refetch()}
        empty={{ title: 'No teams yet.', hint: 'Create a team, add its people, then use it in an assignment rule.' }}
        actions={(team) => (
          <>
            <button type="button" className="link-action" onClick={() => setEditing(team)}>Edit</button>
            <button type="button" className="link-danger" disabled={remove.isPending} onClick={() => handleDelete(team)}>Delete</button>
          </>
        )}
      />
      {editing !== undefined && users.data && <TeamDialog team={editing} people={users.data} onClose={() => setEditing(undefined)} />}
    </>
  )
}
