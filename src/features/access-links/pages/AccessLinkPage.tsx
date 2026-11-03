import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useRedeemAccessLink } from '../hooks/useAccessLinks'

// Public page opened from a shared link (/access/:token): signs the visitor in, then goes to the app.
export function AccessLinkPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const redeem = useRedeemAccessLink()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    redeem.mutate(token, {
      onSuccess: () => {
        queryClient.clear() // drop anything cached for a previous sign-in
        navigate('/', { replace: true })
      },
    })
  }, [token, redeem, queryClient, navigate])

  if (redeem.isError) {
    return (
      <AuthCard title="This link does not work" subtitle="It may have expired or been revoked">
        <p className="mb-4 text-sm text-body">Ask the person who shared it for a new link.</p>
        <Link to="/login" className="btn-primary w-full">Go to sign in</Link>
      </AuthCard>
    )
  }
  return (
    <AuthCard title="Signing you in…" subtitle="One moment">
      <p role="status" className="text-sm text-muted">Opening your workspace.</p>
    </AuthCard>
  )
}
