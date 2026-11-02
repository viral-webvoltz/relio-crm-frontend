import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useLoginTwoFactor } from '../hooks/useAuth'
import { appCode, recoveryCode } from '../schemas/authSchemas'

type Props = { challengeToken: string; onBack: () => void; onExpired: (message: string) => void }

// Second step of sign-in: the 6-digit code from the authenticator app, or one recovery code.
export function TwoFactorStep({ challengeToken, onBack, onExpired }: Props) {
  const navigate = useNavigate()
  const verify = useLoginTwoFactor()
  const [useRecovery, setUseRecovery] = useState(false)
  const [value, setValue] = useState('')
  const [problem, setProblem] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = (useRecovery ? recoveryCode : appCode).safeParse(value)
    if (!parsed.success) return setProblem(parsed.error.issues[0]?.message ?? 'Check the code and try again')
    setProblem('')
    const factor = useRecovery ? { recoveryCode: parsed.data } : { code: parsed.data }
    verify.mutate(
      { challengeToken, factor },
      {
        onSuccess: () => navigate('/', { replace: true }),
        // The sign-in is only valid for a few minutes; after that the person has to start again.
        onError: (e) => e.code === 'INVALID_CHALLENGE' && onExpired(e.message),
      },
    )
  }

  const switchMode = () => {
    setUseRecovery((v) => !v)
    setValue('')
    setProblem('')
    verify.reset()
  }

  const error = problem || (verify.error && verify.error.code !== 'INVALID_CHALLENGE' ? verify.error.message : '')

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        key={useRecovery ? 'recovery' : 'app'}
        label={useRecovery ? 'Recovery code' : '6-digit code'}
        required
        autoFocus
        autoComplete="one-time-code"
        inputMode={useRecovery ? 'text' : 'numeric'}
        autoCapitalize={useRecovery ? 'characters' : 'off'}
        spellCheck={false}
        placeholder={useRecovery ? 'ABCDE-FGHJK' : '123456'}
        hint={useRecovery ? 'Each recovery code works once.' : 'Open your authenticator app and type the code it shows for this account.'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error || undefined}
      />
      <Button type="submit" className="w-full" loading={verify.isPending}>{verify.isPending ? 'Checking…' : 'Verify and sign in'}</Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="link-action" onClick={switchMode}>{useRecovery ? 'Use my authenticator app' : 'Use a recovery code instead'}</button>
        <button type="button" className="link-action" onClick={onBack}>Back to sign in</button>
      </div>
    </form>
  )
}
