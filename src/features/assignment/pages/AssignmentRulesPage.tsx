import { ArrowDown, ArrowUp, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useTeams } from '@/features/teams/hooks/useTeams'
import { useUserOptions } from '@/features/users/hooks/useUsers'
import { cn } from '@/lib/utils'
import { RuleDialog } from '../components/RuleDialog'
import { TryItPanel } from '../components/TryItPanel'
import { resources, useRecordFields } from '../fields'
import { useApplyRules, useDeleteRule, useReorderRules, useRules, useToggleRule } from '../hooks/useAssignment'
import { ruleSummary } from '../summary'
import type { ApplyResult, Resource, Rule } from '../types'

// Rules that hand new leads and tickets to the right person. The first active rule that matches decides.
export function AssignmentRulesPage() {
  const [params, setParams] = useSearchParams()
  const resource: Resource = params.get('type') === 'tickets' ? 'tickets' : 'leads'
  const info = resources.find((r) => r.key === resource)!

  const rules = useRules(resource)
  const teams = useTeams()
  const users = useUserOptions()
  const fields = useRecordFields(resource)
  const reorder = useReorderRules()
  const toggle = useToggleRule()
  const remove = useDeleteRule()
  const apply = useApplyRules()

  // undefined = closed, null = new rule, a Rule = editing it
  const [editing, setEditing] = useState<Rule | null | undefined>(undefined)
  const [announce, setAnnounce] = useState('')
  const [applied, setApplied] = useState<ApplyResult | null>(null)

  const people = users.data ?? []
  const teamList = teams.data ?? []
  const ordered = rules.data ?? []
  const ready = Boolean(users.data && teams.data)
  const anyActive = ordered.some((r) => r.isActive)

  const move = (index: number, by: -1 | 1) => {
    const target = index + by
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    const name = ordered[index]!.name
    reorder.mutate(
      { resource, ids: next.map((r) => r.id) },
      { onSuccess: () => setAnnounce(`Moved “${name}” ${by < 0 ? 'up' : 'down'} to position ${target + 1} of ${ordered.length}.`), onError: (e) => toast.error(e.message) },
    )
  }

  const handleToggle = (rule: Rule) =>
    toggle.mutate({ id: rule.id, isActive: !rule.isActive }, { onSuccess: () => toast.success(rule.isActive ? 'Rule turned off' : 'Rule turned on'), onError: (e) => toast.error(e.message) })

  const handleDelete = async (rule: Rule) => {
    const ok = await confirmDialog(`Delete the rule “${rule.name}”? ${info.label} already assigned stay with their owners. New ones will no longer be routed by this rule.`, { title: 'Delete rule?', confirmLabel: 'Delete rule' })
    if (!ok) return
    remove.mutate(rule.id, { onSuccess: () => toast.success('Rule deleted'), onError: (e) => toast.error(e.message) })
  }

  const handleApply = async () => {
    const ok = await confirmDialog(
      `This looks at up to 200 ${info.noun[1]} that nobody owns (oldest first), applies the rules above, and assigns each one that matches. The people who get them are notified. This changes real ${info.noun[1]} and cannot be undone in one step.`,
      { title: `Assign waiting ${info.noun[1]}?`, confirmLabel: 'Assign them now', tone: 'primary' },
    )
    if (!ok) return
    setApplied(null)
    // One key per confirmed click: a double-click or a retry after a dropped connection runs it once.
    apply.mutate(
      { resource, key: crypto.randomUUID() },
      {
        onSuccess: (result) => {
          setApplied(result)
          toast.success(result.assigned === 0 ? 'Nothing was assigned' : `${result.assigned} ${result.assigned === 1 ? info.noun[0] : info.noun[1]} assigned`)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Assignment rules"
        subtitle="Hand new leads and tickets to the right person or team automatically."
        actions={
          <button type="button" className="btn-primary" disabled={!ready} onClick={() => setEditing(null)}>
            <Plus className="size-4" aria-hidden /> New rule
          </button>
        }
      />

      <div role="tablist" aria-label="Record type" className="mb-4 flex border-b border-border">
        {resources.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={resource === r.key}
            onClick={() => { setParams(r.key === 'leads' ? {} : { type: r.key }); setApplied(null); setAnnounce('') }}
            className={cn('h-11 border-b-2 px-4 text-sm font-medium', resource === r.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-heading')}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="mb-4 max-w-3xl text-sm text-muted">
        Rules are checked from top to bottom and the <strong className="text-heading">first one that matches decides</strong>. If its team has no active people, the next rule is tried. A new {info.noun[0]} that matches nothing stays unassigned. Groups of people live on the{' '}
        <Link to="/settings/teams" className="link-action">Teams</Link> page.
      </p>

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      {rules.isPending || !ready ? (
        <PageSkeleton />
      ) : rules.isError ? (
        <div className="card"><ErrorState message={rules.error.message} onRetry={() => rules.refetch()} /></div>
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title={`No ${info.noun[0]} rules yet`} hint={`Create a rule to give new ${info.noun[1]} to a person or team automatically.`} />
        </div>
      ) : (
        <ol className="space-y-3" aria-label={`${info.label} rules in the order they are checked`}>
          {ordered.map((rule, i) => (
            <li key={rule.id} className={cn('card flex flex-wrap items-start gap-4 p-4', !rule.isActive && 'opacity-80')}>
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-heading">{rule.name}</h3>
                  <Badge tone={rule.isActive ? 'success' : 'neutral'}>{rule.isActive ? 'on' : 'off'}</Badge>
                </div>
                <p className="mt-1 text-sm text-body">{ruleSummary(rule, { fields, people, teams: teamList })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.isActive}
                  aria-label={`Rule “${rule.name}” is ${rule.isActive ? 'on' : 'off'}`}
                  disabled={toggle.isPending}
                  onClick={() => handleToggle(rule)}
                  className={cn('relative mx-2 h-6 w-11 shrink-0 rounded-full transition', rule.isActive ? 'bg-primary' : 'bg-border')}
                >
                  <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', rule.isActive ? 'left-[22px]' : 'left-0.5')} />
                </button>
                <button type="button" aria-label={`Move “${rule.name}” up`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading disabled:opacity-40"><ArrowUp className="size-4" aria-hidden /></button>
                <button type="button" aria-label={`Move “${rule.name}” down`} disabled={i === ordered.length - 1 || reorder.isPending} onClick={() => move(i, 1)} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading disabled:opacity-40"><ArrowDown className="size-4" aria-hidden /></button>
                <button type="button" className="link-action" onClick={() => setEditing(rule)}>Edit</button>
                <button type="button" className="link-danger" disabled={remove.isPending} onClick={() => handleDelete(rule)}>Delete</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 space-y-6">
        <TryItPanel key={resource} resource={resource} fields={fields} people={people} />

        <section aria-labelledby="apply-now" className="card space-y-3 p-6">
          <h2 id="apply-now" className="text-base font-semibold text-heading">Assign waiting {info.noun[1]}</h2>
          <p className="text-sm text-muted">Rules only act on {info.noun[1]} created after they exist. Use this to route the ones nobody owns yet, oldest first, up to 200 at a time.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={apply.isPending} disabled={!anyActive} onClick={handleApply}>{apply.isPending ? 'Assigning…' : `Assign waiting ${info.noun[1]} now`}</Button>
            {!anyActive && <span className="text-sm text-muted">Turn on at least one rule first.</span>}
          </div>
          {applied && (
            <p role="status" className="rounded-xl bg-background px-3 py-2 text-sm text-body">
              Checked {applied.checked} {applied.checked === 1 ? info.noun[0] : info.noun[1]} with no owner: <strong className="text-heading">{applied.assigned} assigned</strong>, {applied.unassigned} left unassigned (no rule matched).
              {applied.checked >= 200 && ' There may be more waiting: run it again to continue.'}
            </p>
          )}
        </section>
      </div>

      {editing !== undefined && ready && (
        <RuleDialog resource={resource} rule={editing} people={people} teams={teamList} fields={fields} onClose={() => setEditing(undefined)} />
      )}
    </>
  )
}
