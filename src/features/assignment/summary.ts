import type { FieldMeta } from '@/features/workflows/types'
import { needsValue } from '@/features/workflows/graph'
import type { Rule } from './types'

type Person = { id: string; fullName: string }
type TeamRef = { id: string; name: string }
type Lookup = { fields: FieldMeta[]; people: Person[]; teams: TeamRef[] }

const phrase: Record<string, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  in: 'is one of',
  is_empty: 'is empty',
  is_not_empty: 'is filled in',
}

export const personName = (people: Person[], id: string) => people.find((p) => p.id === id)?.fullName ?? 'someone who is no longer here'
export const teamName = (teams: TeamRef[], id: string) => teams.find((t) => t.id === id)?.name ?? 'a deleted team'

// "When status is new or source is website, give it to the Sales team in turn."
export function ruleSummary(rule: Rule, { fields, people, teams }: Lookup): string {
  const noun = rule.resource === 'leads' ? 'lead' : 'ticket'
  const conditions = rule.conditions.rules.map((c) => {
    const meta = fields.find((f) => f.key === c.field)
    const value = needsValue(c.operator) ? (meta?.type === 'user' ? personName(people, c.value ?? '') : c.value) : ''
    return `${meta?.label ?? c.field} ${phrase[c.operator] ?? c.operator}${value ? ` ${value}` : ''}`.toLowerCase()
  })
  const when = conditions.length === 0 ? `Every new ${noun}` : `When ${conditions.join(rule.conditions.mode === 'any' ? ' or ' : ' and ')}`
  const target = rule.target
  const who =
    target.type === 'user'
      ? `give it to ${personName(people, target.userId)}`
      : `give it to the ${teamName(teams, target.teamId)} team ${target.strategy === 'round_robin' ? 'in turn' : '(whoever has the fewest open)'}`
  return `${when}, ${who}.`
}
