import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

// Catches render/loader failures for a route so one broken page never takes the whole app down.
export function RouteError() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <main role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold text-heading">{notFound ? "We couldn't find that page" : 'Something went wrong'}</h1>
      <p className="max-w-sm text-sm text-muted">
        {notFound ? 'The link may be broken or the page may have moved.' : 'This page hit an unexpected problem. Your data is safe. Try again, or head back to the dashboard.'}
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="ghost" onClick={() => window.location.reload()}>Try again</Button>
        <Link to="/" className="btn-primary">Back to dashboard</Link>
      </div>
    </main>
  )
}
