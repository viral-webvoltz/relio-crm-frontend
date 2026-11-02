import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useCan } from '@/features/auth/hooks/useCan'
import { TagChip } from '../components/TagChip'
import { TagContactsDialog } from '../components/TagContactsDialog'
import { TagDialog } from '../components/TagDialog'
import { useDeleteTag, useTags } from '../hooks/useTags'
import { colorName, type TagWithCount } from '../types'

type Dialog = { kind: 'edit'; tag: TagWithCount | null } | { kind: 'contacts'; tag: TagWithCount } | null

// Settings → Tags: the labels people put on contacts. Rename, recolour, see who has one, delete.
export function TagsPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useTags()
  const remove = useDeleteTag()
  const canEdit = useCan('contacts.update')
  const [dialog, setDialog] = useState<Dialog>(null)

  const handleDelete = async (tag: TagWithCount) => {
    const affected = tag.usageCount === 0 ? 'No contacts use it.' : `It will be removed from ${tag.usageCount} contact${tag.usageCount === 1 ? '' : 's'}. The contacts themselves are not deleted.`
    if (!(await confirmDialog(`Delete the tag “${tag.name}”? ${affected}`, { title: 'Delete tag?', confirmLabel: 'Delete tag' }))) return
    remove.mutate(tag.id, { onSuccess: () => toast.success('Tag deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<TagWithCount>[] = [
    { key: 'tag', header: 'Tag', primary: true, cell: (tag) => <TagChip tag={tag} /> },
    { key: 'colour', header: 'Colour', cell: (tag) => colorName(tag.color) },
    { key: 'usage', header: 'Contacts', align: 'right', cell: (tag) => tag.usageCount },
  ]

  return (
    <>
      <PageHeader
        title="Tags"
        subtitle="Labels you can put on contacts to group and find them."
        actions={canEdit && <button type="button" className="btn-primary" onClick={() => setDialog({ kind: 'edit', tag: null })}><Plus className="size-4" aria-hidden /> New tag</button>}
      />
      <DataTable
        caption="Tags"
        columns={columns}
        rows={data}
        rowKey={(tag) => tag.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No tags yet.', hint: canEdit ? 'Create one here, or type a new name in the Tags box when editing a contact.' : 'Tags created by your team appear here.' }}
        actions={(tag) => (
          <>
            {tag.usageCount > 0 && <button type="button" className="link-action" onClick={() => setDialog({ kind: 'contacts', tag })}>Contacts</button>}
            {canEdit && <button type="button" className="link-action" onClick={() => setDialog({ kind: 'edit', tag })}>Edit</button>}
            {canEdit && <button type="button" className="link-danger" onClick={() => handleDelete(tag)}>Delete</button>}
          </>
        )}
      />
      {dialog?.kind === 'edit' && <TagDialog tag={dialog.tag} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'contacts' && <TagContactsDialog tag={dialog.tag} onClose={() => setDialog(null)} />}
    </>
  )
}
