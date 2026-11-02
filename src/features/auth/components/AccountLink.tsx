import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

// For the user menu: a link to the signed-in person's own account and security page (route /account).
export function AccountLink({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <Link to="/account" onClick={onNavigate} className={className ?? 'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-heading hover:bg-primary-soft'}>
      <ShieldCheck className="size-4" aria-hidden /> Account &amp; security
    </Link>
  )
}
