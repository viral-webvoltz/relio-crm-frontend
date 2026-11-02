import { format, parseISO } from 'date-fns'
import { Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useListParams } from '@/lib/useListParams'
import { useNotices } from '../hooks/usePortalExtras'

export function PortalNoticesPage() {
  const { params, update } = useListParams()
  const { data, isPending, isError, error, refetch } = useNotices(params.page)

  return (
    <>
      <PageHeader title="News and updates" subtitle="Messages from our team." />
      {isPending ? (
        <PageSkeleton />
      ) : isError ? (
        <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
      ) : data.data.length === 0 ? (
        <div className="card"><EmptyState icon={Megaphone} title="No updates right now" hint="When we have news for you, it will appear here." /></div>
      ) : (
        <>
          <ul className="space-y-3">
            {data.data.map((notice) => (
              <li key={notice.id} className="card p-5">
                <h2 className="text-base font-semibold text-heading">{notice.title}</h2>
                {notice.publishedAt && <p className="text-xs text-muted">{format(parseISO(notice.publishedAt), 'd MMMM yyyy')}</p>}
                <p className="mt-2 whitespace-pre-line text-sm text-body">{notice.body}</p>
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} onPageChange={(page) => update({ page })} />
        </>
      )}
    </>
  )
}
