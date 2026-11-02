import { format, parseISO } from 'date-fns'
import { Download, FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useListParams } from '@/lib/useListParams'
import { downloadDocument } from '../api/portalExtrasApi'
import { useDocuments } from '../hooks/usePortalExtras'
import { formatFileSize, type PortalDocument } from '../portalExtras'

export function PortalDocumentsPage() {
  const { params, update } = useListParams()
  const { data, isPending, isFetching, isError, error, refetch } = useDocuments(params.page)
  const [downloading, setDownloading] = useState<string | null>(null)

  const download = async (doc: PortalDocument) => {
    setDownloading(doc.id)
    try {
      await downloadDocument(doc)
    } catch (e) {
      toast.error((e as Error).message || 'We could not download that file. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const columns: Column<PortalDocument>[] = [
    { key: 'name', header: 'Document', primary: true, cell: (doc) => <><div className="font-medium text-heading">{doc.name}</div><div className="text-xs text-muted">{doc.fileName}</div></> },
    { key: 'size', header: 'Size', cell: (doc) => formatFileSize(doc.sizeBytes) },
    { key: 'date', header: 'Added', cell: (doc) => format(parseISO(doc.createdAt), 'd MMM yyyy') },
  ]

  return (
    <>
      <PageHeader title="My documents" subtitle="Files we have shared with you." />
      <DataTable
        caption="My documents"
        columns={columns}
        rows={data?.data}
        rowKey={(doc) => doc.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: FileText, title: 'No documents yet', hint: 'Files we share with you will appear here.' }}
        actions={(doc) => (
          <Button variant="ghost" className="h-9" disabled={downloading === doc.id} onClick={() => download(doc)} aria-label={`Download ${doc.name}`}>
            <Download className="size-4" aria-hidden /> {downloading === doc.id ? 'Downloading…' : 'Download'}
          </Button>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
      />
    </>
  )
}
