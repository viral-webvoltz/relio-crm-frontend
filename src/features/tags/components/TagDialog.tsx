import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { cn } from '@/lib/utils'
import { useCreateTag, useUpdateTag } from '../hooks/useTags'
import { tagColors, type Tag } from '../types'
import { TagChip } from './TagChip'

const schema = z.object({ name: z.string().trim().min(1, 'Enter a name for the tag').max(40, 'Keep it under 40 characters'), color: z.string() })
type Values = z.infer<typeof schema>

// Create a tag, or rename/recolour one. Mounted only while open so the form starts fresh each time.
export function TagDialog({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const create = useCreateTag()
  const update = useUpdateTag()
  const mutation = tag ? update : create
  const { register, control, handleSubmit, watch, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: tag?.name ?? '', color: tag?.color ?? tagColors[0].value },
  })
  useServerFieldErrors(mutation.error, setError)
  useEffect(() => dialog.current?.showModal(), [])

  const done = (message: string) => ({
    onSuccess: () => {
      toast.success(message)
      dialog.current?.close()
    },
  })
  const onSubmit = (v: Values) =>
    tag ? update.mutate({ id: tag.id, changes: { name: v.name.trim(), color: v.color } }, done('Tag updated')) : create.mutate({ name: v.name.trim(), color: v.color }, done('Tag created'))

  // A name that is already taken comes back as TAG_NAME_TAKEN; show it on the name field rather than only in the banner.
  const taken = mutation.error?.code === 'TAG_NAME_TAKEN' ? mutation.error.message : undefined

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tag-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <form noValidate className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
        <h2 id="tag-dialog-title" className="text-lg font-semibold text-heading">{tag ? 'Edit tag' : 'New tag'}</h2>
        <Field label="Name" required autoComplete="off" maxLength={40} placeholder="e.g. VIP" error={errors.name?.message ?? taken} {...register('name')} />
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-heading">Colour</legend>
              <div role="radiogroup" aria-label="Tag colour" className="flex flex-wrap gap-2">
                {tagColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === c.value}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => field.onChange(c.value)}
                    className={cn('grid size-11 place-items-center rounded-full border-2', field.value === c.value ? 'border-heading' : 'border-transparent hover:border-border')}
                  >
                    <span className="size-6 rounded-full" style={{ backgroundColor: c.value }} />
                    {field.value === c.value && <span className="sr-only">(selected)</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Colour is only decoration. The name is always shown too.</p>
            </fieldset>
          )}
        />
        <div aria-live="polite" className="text-sm text-muted">Preview: <TagChip tag={{ name: watch('name').trim() || 'Tag name', color: watch('color') }} /></div>
        {mutation.error && !taken && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{mutation.isPending ? 'Saving…' : tag ? 'Save changes' : 'Create tag'}</Button>
        </div>
      </form>
    </dialog>
  )
}
