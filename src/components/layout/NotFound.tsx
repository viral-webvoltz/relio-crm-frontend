import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="bg-gradient-to-br from-primary to-indigo-500 bg-clip-text text-7xl font-bold text-transparent">404</p>
      <h1 className="text-xl font-semibold text-heading">We couldn't find that page</h1>
      <p className="max-w-sm text-sm text-muted">The link may be broken or the page may have moved.</p>
      <Link to="/" className="btn-primary mt-2">Back to dashboard</Link>
    </main>
  )
}
