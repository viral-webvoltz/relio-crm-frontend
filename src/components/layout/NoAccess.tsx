import { Link } from 'react-router-dom'

export function NoAccess() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="bg-gradient-to-br from-primary to-indigo-500 bg-clip-text text-7xl font-bold text-transparent">403</p>
      <h1 className="text-xl font-semibold text-heading">You don't have access to this page</h1>
      <p className="max-w-sm text-sm text-muted">Your role doesn't include this area. If you think it should, ask an administrator to update your permissions.</p>
      <Link to="/" className="btn-primary mt-2">Back to dashboard</Link>
    </div>
  )
}
