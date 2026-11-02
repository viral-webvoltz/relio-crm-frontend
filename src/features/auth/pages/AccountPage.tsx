import { PageHeader } from '@/components/layout/PageHeader'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ChangePasswordCard } from '../components/ChangePasswordCard'
import { SessionsCard } from '../components/SessionsCard'
import { TwoFactorCard } from '../components/TwoFactorCard'
import { useCurrentUser } from '../hooks/useAuth'

// Everything a signed-in person manages about their own sign-in. No extra permission: it is always their own account.
export function AccountPage() {
  const { data: user, isPending } = useCurrentUser()
  if (isPending) return <PageSkeleton />

  return (
    <>
      <PageHeader title="Account & security" subtitle="Your sign-in details, password and the devices that are signed in." />
      <div className="mx-auto max-w-3xl space-y-6">
        {user && (
          <section className="card p-6" aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="mb-3 text-base font-semibold text-heading">Your details</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-medium text-heading">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="break-all font-medium text-heading">{user.email}</dd>
              </div>
              {user.organization && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Organization</dt>
                  <dd className="font-medium text-heading">{user.organization.name} <span className="font-normal text-muted">({user.organization.slug})</span></dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-muted">To change your name or email, ask an administrator.</p>
          </section>
        )}
        <ChangePasswordCard />
        <TwoFactorCard />
        <SessionsCard />
      </div>
    </>
  )
}
