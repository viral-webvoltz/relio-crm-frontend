import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActivityItem } from '../components/ActivityItem'
import { useRecentActivities } from '../hooks/useActivities'
import { relatedRoutes } from '../types'

export function ActivityFeedPage() {
  const { data, isPending, isError, error, refetch } = useRecentActivities()

  return (
    <>
      <PageHeader title="Activity" subtitle="The latest notes, calls, meetings and emails across your team." />
      <div className="card max-w-3xl p-6">
        {isPending ? (
          <PageSkeleton />
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted">Nothing has been logged yet. Open a lead, deal, contact or company to log the first activity.</p>
        ) : (
          <ol className="space-y-5">
            {data.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                context={
                  <Link to={`${relatedRoutes[activity.relatedType]}/${activity.relatedId}/edit`} className="text-xs capitalize text-primary hover:underline">
                    Open {activity.relatedType}
                  </Link>
                }
              />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
