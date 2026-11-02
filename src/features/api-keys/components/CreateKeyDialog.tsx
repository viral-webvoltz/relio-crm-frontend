import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useCreateApiKey, useScopes } from '../hooks/useApiKeys'
import { apiKeyFormSchema, emptyApiKey, expiryOptions, toPayload, type ApiKeyFormValues } from '../schemas/apiKeySchema'
import { groupScopes, scopeName } from '../scopes'
import type { CreatedApiKey } from '../types'

function CreateKeyForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (created: CreatedApiKey) => void }) {
  const scopes = useScopes()
  const create = useCreateApiKey()
  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<ApiKeyFormValues>({ resolver: zodResolver(apiKeyFormSchema), defaultValues: emptyApiKey })
  useServerFieldErrors(create.error, setError)
  const chosen = watch('scopes')

  const onSubmit = (values: ApiKeyFormValues) => create.mutate(toPayload(values), { onSuccess: onCreated })
  const toggleGroup = (items: string[]) => {
    const all = items.every((s) => chosen.includes(s))
    setValue('scopes', all ? chosen.filter((s) => !items.includes(s)) : [...new Set([...chosen, ...items])], { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-h-[85vh] flex-col">
      <div className="space-y-5 overflow-y-auto p-6">
        <div>
          <h2 id="create-key-title" className="text-lg font-semibold text-heading">Create an API key</h2>
          <p className="mt-1 text-sm text-muted">A key lets a script or another app use this CRM without a person signing in. It can only do what you tick below, and never more than you can do yourself.</p>
        </div>
        <Field label="Name" required autoComplete="off" placeholder="e.g. Website contact form" hint="Only you and your team see this name." error={errors.name?.message} {...register('name')} />
        <SelectField label="Expires" hint="A key that expires stops working on its own. You can always revoke it sooner." {...register('expiresIn')}>
          {expiryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>

        <fieldset className="space-y-4" aria-describedby={errors.scopes ? 'scopes-error' : undefined}>
          <legend className="text-sm font-medium text-heading">What may this key do? <span className="text-destructive" aria-hidden>*</span></legend>
          {scopes.isPending && <p className="text-sm text-muted">Loading what you can allow…</p>}
          {scopes.isError && <p role="alert" className="text-sm text-destructive">{scopes.error.message} <button type="button" className="link-action" onClick={() => scopes.refetch()}>Try again</button></p>}
          {scopes.data && scopes.data.length === 0 && <p className="text-sm text-muted">Your role has no rights that can be given to a key.</p>}
          {scopes.data && groupScopes(scopes.data).map((group) => (
            <fieldset key={group.area} className="rounded-xl border border-border/70 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</legend>
              <div className="mb-2 flex justify-end">
                <button type="button" className="link-action" onClick={() => toggleGroup(group.scopes)}>
                  {group.scopes.every((s) => chosen.includes(s)) ? `Clear all ${group.label.toLowerCase()}` : `Select all ${group.label.toLowerCase()}`}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.scopes.map((scope) => <Checkbox key={scope} label={scopeName(scope)} value={scope} {...register('scopes')} />)}
              </div>
            </fieldset>
          ))}
          {errors.scopes && <p id="scopes-error" role="alert" className="text-xs text-destructive">{errors.scopes.message}</p>}
        </fieldset>

        {create.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{create.error.message}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>{create.isPending ? 'Creating…' : 'Create key'}</Button>
      </div>
    </form>
  )
}

export function CreateKeyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (created: CreatedApiKey) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="create-key-title"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {open && <CreateKeyForm onCancel={onClose} onCreated={onCreated} />}
    </dialog>
  )
}
