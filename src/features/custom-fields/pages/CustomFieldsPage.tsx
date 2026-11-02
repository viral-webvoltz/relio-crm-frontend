import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'
import { DefinitionDialog } from '../components/DefinitionDialog'
import { useAllCustomFieldDefinitions, useDeleteDefinition, useUpdateDefinition } from '../hooks/useCustomFields'
import { entityLabel, entityTypes, typeLabel, type CustomFieldDefinition, type EntityType } from '../types'

// Settings → Custom fields: the extra details an organisation tracks on leads, contacts and deals.
export function CustomFieldsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const entity: EntityType = entityTypes.find((e) => e === searchParams.get('entity')) ?? 'lead'
  const { data, isPending, isFetching, isError, error, refetch } = useAllCustomFieldDefinitions(entity)
  const update = useUpdateDefinition()
  const hide = useDeleteDefinition()
  const [dialog, setDialog] = useState<{ definition: CustomFieldDefinition | null } | null>(null)
  const noun = entityLabel[entity].singular

  const handleHide = async (def: CustomFieldDefinition) => {
    const message = `Delete the field “${def.label}”? It disappears from ${noun} forms. Values already saved on existing ${noun}s are kept but no longer shown or editable. You can turn the field back on later.`
    if (!(await confirmDialog(message, { title: 'Delete field?', confirmLabel: 'Delete field' }))) return
    hide.mutate(def.id, { onSuccess: () => toast.success('Field deleted'), onError: (e) => toast.error(e.message) })
  }
  const handleTurnOn = (def: CustomFieldDefinition) =>
    update.mutate({ id: def.id, changes: { isActive: true } }, { onSuccess: () => toast.success('Field turned on'), onError: (e) => toast.error(e.message) })

  const columns: Column<CustomFieldDefinition>[] = [
    {
      key: 'label',
      header: 'Field',
      primary: true,
      cell: (def) => (
        <>
          <div className="font-medium text-heading">{def.label}</div>
          <div className="text-xs text-muted">{def.key}</div>
        </>
      ),
    },
    { key: 'type', header: 'Type', cell: (def) => typeLabel[def.type] },
    { key: 'options', header: 'Options', cell: (def) => (def.options?.length ? <span className="line-clamp-2 text-sm">{def.options.join(', ')}</span> : <span className="text-muted">—</span>) },
    { key: 'required', header: 'Required', cell: (def) => (def.required ? 'Yes' : 'No') },
    { key: 'status', header: 'Status', cell: (def) => <StatusBadge domain="active" status={def.isActive ? 'active' : 'inactive'} /> },
  ]

  return (
    <>
      <PageHeader
        title="Custom fields"
        subtitle="Track extra details on leads, contacts and deals. They appear on the matching form."
        actions={<button type="button" className="btn-primary" onClick={() => setDialog({ definition: null })}><Plus className="size-4" aria-hidden /> New field</button>}
      />
      <div role="group" aria-label="Record type" className="mb-4 flex flex-wrap gap-2">
        {entityTypes.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={e === entity}
            onClick={() => setSearchParams(e === 'lead' ? {} : { entity: e })}
            className={cn('btn-ghost h-10', e === entity && 'border-primary bg-primary-soft text-primary')}
          >
            {entityLabel[e].plural}
          </button>
        ))}
      </div>
      <DataTable
        caption={`Custom fields for ${noun}s`}
        columns={columns}
        rows={data}
        rowKey={(def) => def.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: `No custom fields for ${noun}s yet.`, hint: 'Add a field, for example “Customer tier”, to see it on the form.' }}
        actions={(def) => (
          <>
            <button type="button" className="link-action" onClick={() => setDialog({ definition: def })}>Edit</button>
            {def.isActive ? (
              <button type="button" className="link-danger" onClick={() => handleHide(def)}>Delete</button>
            ) : (
              <button type="button" className="link-action" disabled={update.isPending} onClick={() => handleTurnOn(def)}>Turn on</button>
            )}
          </>
        )}
      />
      {dialog && <DefinitionDialog entity={entity} definition={dialog.definition} onClose={() => setDialog(null)} />}
    </>
  )
}
