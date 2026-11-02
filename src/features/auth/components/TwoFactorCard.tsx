import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { ErrorState } from '@/components/ui/Skeleton'
import type { TwoFactorSetup } from '../api/authApi'
import { useDisableTwoFactor, useEnableTwoFactor, useRegenerateRecoveryCodes, useStartTwoFactorSetup, useTwoFactorStatus } from '../hooks/useAccount'
import { appCode, codeSchema, recoveryCode, regenerateSchema, setupPasswordSchema } from '../schemas/authSchemas'
import { copyText, RecoveryCodes } from './RecoveryCodes'

type Step =
  | { name: 'idle' }
  | { name: 'password' }
  | { name: 'setup'; setup: TwoFactorSetup }
  | { name: 'regenerate' }
  | { name: 'disable' }
  | { name: 'codes'; heading: string; codes: string[]; note?: string }

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'

// Groups the key in fours so it is easier to read and type; Copy still copies the plain key.
const grouped = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim()

// Step 1 of turning it on: asking for the password again stops someone at an unlocked screen from enrolling their own phone.
function PasswordStep({ onStarted, onCancel }: { onStarted: (setup: TwoFactorSetup) => void; onCancel: () => void }) {
  const start = useStartTwoFactorSetup()
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string }>({ resolver: zodResolver(setupPasswordSchema) })
  return (
    <form onSubmit={handleSubmit((v) => start.mutate(v.password, { onSuccess: onStarted }))} noValidate className="max-w-md space-y-4">
      <p className="text-sm text-body">Enter your password to start. You will need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or Authy.</p>
      <Field label="Your password" required type="password" autoComplete="current-password" autoFocus error={errors.password?.message} {...register('password')} />
      {start.error && <p role="alert" className={alertClass}>{start.error.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={start.isPending}>Continue</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

// Step 2: the key goes into the app (no QR code yet), then a code from the app proves it works.
function SetupStep({ setup, onEnabled, onCancel }: { setup: TwoFactorSetup; onEnabled: (codes: string[]) => void; onCancel: () => void }) {
  const enable = useEnableTwoFactor()
  const { register, handleSubmit, formState: { errors } } = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) })
  // The server builds this link; only a real otpauth link is ever put in an href.
  const link = setup.otpauthUrl.startsWith('otpauth://') ? setup.otpauthUrl : null
  return (
    <div className="max-w-md space-y-4">
      <ol className="list-decimal space-y-3 pl-5 text-sm text-body">
        <li>
          In your authenticator app choose “add account” and “enter a setup key”, then type this key:
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-background px-3 py-2 font-mono text-sm tracking-wider text-heading" aria-label="Setup key">{grouped(setup.secret)}</code>
            <Button variant="ghost" onClick={() => copyText(setup.secret, 'Setup key copied')}><Copy className="size-4" aria-hidden /> Copy key</Button>
          </div>
          {link && <p className="mt-2 text-xs text-muted">On your phone? <a href={link} className="text-primary hover:underline">Open it in your authenticator app</a>.</p>}
        </li>
        <li>Type the 6-digit code the app now shows to confirm it works.</li>
      </ol>
      <form onSubmit={handleSubmit((v) => enable.mutate(v.code, { onSuccess: onEnabled }))} noValidate className="space-y-4">
        <Field label="6-digit code" required autoComplete="one-time-code" inputMode="numeric" placeholder="123456" error={errors.code?.message} {...register('code')} />
        {enable.error && <p role="alert" className={alertClass}>{enable.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={enable.isPending}>Turn on two-step verification</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function RegenerateStep({ onDone, onCancel }: { onDone: (codes: string[]) => void; onCancel: () => void }) {
  const regenerate = useRegenerateRecoveryCodes()
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string; code: string }>({ resolver: zodResolver(regenerateSchema) })
  const submit = async (values: { password: string; code: string }) => {
    if (!(await confirmDialog('Your current recovery codes will stop working straight away. Make new ones?', { title: 'Make new recovery codes?', confirmLabel: 'Make new codes' }))) return
    regenerate.mutate({ password: values.password, code: appCode.parse(values.code) }, { onSuccess: onDone })
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="max-w-md space-y-4">
      <Field label="Your password" required type="password" autoComplete="current-password" autoFocus error={errors.password?.message} {...register('password')} />
      <Field label="6-digit code from your app" required autoComplete="one-time-code" inputMode="numeric" placeholder="123456" error={errors.code?.message} {...register('code')} />
      {regenerate.error && <p role="alert" className={alertClass}>{regenerate.error.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={regenerate.isPending}>Make new codes</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

function DisableStep({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const disable = useDisableTwoFactor()
  const [useRecovery, setUseRecovery] = useState(false)
  const [password, setPassword] = useState('')
  const [factor, setFactor] = useState('')
  const [problems, setProblems] = useState<{ password?: string; factor?: string }>({})

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = (useRecovery ? recoveryCode : appCode).safeParse(factor)
    const next = { password: password ? undefined : 'Enter your password', factor: parsed.success ? undefined : parsed.error.issues[0]?.message }
    setProblems(next)
    if (next.password || !parsed.success) return
    if (!(await confirmDialog('Your account will only be protected by your password. You can turn this on again at any time.', { title: 'Turn off two-step verification?', confirmLabel: 'Turn it off' }))) return
    disable.mutate({ password, factor: useRecovery ? { recoveryCode: parsed.data } : { code: parsed.data } }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-4">
      <Field label="Your password" required type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} error={problems.password} />
      <Field
        key={useRecovery ? 'recovery' : 'app'}
        label={useRecovery ? 'Recovery code' : '6-digit code from your app'}
        required
        autoComplete="one-time-code"
        inputMode={useRecovery ? 'text' : 'numeric'}
        placeholder={useRecovery ? 'ABCDE-FGHJK' : '123456'}
        value={factor}
        onChange={(e) => setFactor(e.target.value)}
        error={problems.factor}
      />
      <button type="button" className="link-action" onClick={() => { setUseRecovery((v) => !v); setFactor(''); setProblems({}) }}>
        {useRecovery ? 'Use my authenticator app instead' : 'Use a recovery code instead'}
      </button>
      {disable.error && <p role="alert" className={alertClass}>{disable.error.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={disable.isPending}>Turn off</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export function TwoFactorCard() {
  const status = useTwoFactorStatus()
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const idle = () => setStep({ name: 'idle' })

  const body = (() => {
    if (status.isPending) return <p className="text-sm text-muted">Loading…</p>
    if (status.isError) return <ErrorState message={status.error.message} onRetry={() => status.refetch()} />
    if (step.name === 'codes') return <RecoveryCodes heading={step.heading} codes={step.codes} note={step.note} onDone={idle} />
    if (step.name === 'password') return <PasswordStep onStarted={(setup) => setStep({ name: 'setup', setup })} onCancel={idle} />
    if (step.name === 'setup')
      return (
        <SetupStep
          setup={step.setup}
          onCancel={idle}
          onEnabled={(codes) => {
            toast.success('Two-step verification is on')
            setStep({ name: 'codes', heading: 'Your recovery codes', codes, note: 'For your safety, your other devices were signed out.' })
          }}
        />
      )
    if (step.name === 'regenerate') return <RegenerateStep onCancel={idle} onDone={(codes) => setStep({ name: 'codes', heading: 'Your new recovery codes', codes, note: 'The old codes no longer work.' })} />
    if (step.name === 'disable') return <DisableStep onCancel={idle} onDone={() => { toast.success('Two-step verification is off'); idle() }} />

    const s = status.data
    return s.enabled ? (
      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-body">
          <ShieldCheck className="size-4 text-success" aria-hidden /> <Badge tone="success">On</Badge> You need a code from your app each time you sign in.
        </p>
        <p className={s.recoveryCodesRemaining <= 2 ? 'text-sm font-medium text-warning' : 'text-sm text-muted'}>
          {s.recoveryCodesRemaining === 0 ? 'You have no recovery codes left. Make new ones now.' : `${s.recoveryCodesRemaining} recovery code${s.recoveryCodesRemaining === 1 ? '' : 's'} left${s.recoveryCodesRemaining <= 2 ? '. Consider making new ones.' : '.'}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setStep({ name: 'regenerate' })}>Make new recovery codes</Button>
          <Button variant="ghost" onClick={() => setStep({ name: 'disable' })}>Turn off</Button>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-body">
          <ShieldOff className="size-4 text-muted" aria-hidden /> <Badge tone="neutral">Off</Badge> Add a second step so a stolen password alone is not enough.
        </p>
        {s.setupPending && <p className="text-sm text-muted">You started setting this up but did not finish. Start again to get a new key.</p>}
        <Button onClick={() => setStep({ name: 'password' })}>Set up two-step verification</Button>
      </div>
    )
  })()

  return (
    <section className="card p-6" aria-labelledby="two-factor-heading">
      <h2 id="two-factor-heading" className="mb-3 text-base font-semibold text-heading">Two-step verification</h2>
      {body}
    </section>
  )
}
