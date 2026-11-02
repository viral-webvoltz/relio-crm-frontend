import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSection } from '@/components/ui/FormSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { toMajor } from '@/lib/money'
import { StockPanel } from '../components/StockPanel'
import { useCategories, useProduct, useSaveProduct } from '../hooks/useProducts'
import { emptyProduct, productFormSchema, type ProductFormValues } from '../schemas/productSchema'

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isPending, isError, error } = useProduct(id)
  const categories = useCategories()
  const save = useSaveProduct(id)

  const { register, handleSubmit, setError, watch, formState: { errors, isDirty } } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProduct,
    values: product && {
      name: product.name,
      sku: product.sku ?? '',
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      price: toMajor(product.priceMinor),
      currency: product.currency,
      trackInventory: product.trackInventory,
      initialStock: '0',
      reorderLevel: String(product.reorderLevel),
      isActive: product.isActive,
    },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  const tracksInventory = watch('trackInventory')

  if (id && isPending) return <p className="text-sm text-muted">Loading product…</p>
  if (id && isError) return <p role="alert" className="text-sm text-destructive">{error.message}</p>

  const onSubmit = (values: ProductFormValues) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(id ? 'Product updated' : 'Product created')
        allowLeave()
        navigate('/products')
      },
    })

  return (
    <>
      <PageHeader title={id ? 'Edit product' : 'New product'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <FormSection title="Basics">
          <Field label="Name" required error={errors.name?.message} {...register('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" hint="Your own code for this product" placeholder="e.g. WDG-001" error={errors.sku?.message} {...register('sku')} />
            <SelectField label="Category" {...register('categoryId')}>
              <option value="">No category</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
          </div>
          <Field label="Description" error={errors.description?.message} {...register('description')} />
        </FormSection>
        <FormSection title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price" required inputMode="decimal" error={errors.price?.message} {...register('price')} />
            <Field label="Currency" required hint="3-letter code, e.g. USD" autoCapitalize="characters" maxLength={3} error={errors.currency?.message} {...register('currency')} />
          </div>
        </FormSection>
        <FormSection title="Inventory">
          <div className="space-y-3">
            <Checkbox label="Track inventory" {...register('trackInventory')} />
            {tracksInventory && (
              <div className="grid gap-4 sm:grid-cols-2">
                {!id && <Field label="Starting stock" inputMode="numeric" error={errors.initialStock?.message} {...register('initialStock')} />}
                <Field label="Low-stock alert at (0 = off)" inputMode="numeric" error={errors.reorderLevel?.message} {...register('reorderLevel')} />
              </div>
            )}
            <Checkbox label="Active (available to sell)" {...register('isActive')} />
          </div>
        </FormSection>
        {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/products" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      {product && <StockPanel product={product} />}
    </>
  )
}
