import { useSearchParams } from 'react-router-dom'
import { useCan } from '@/features/auth/hooks/useCan'
import { ExportButton } from '@/features/exports/components/ExportButton'
import type { ExportResource } from '@/features/exports/api/exportsApi'
import { ImportButton } from '@/features/imports/components/ImportButton'
import type { ImportResource } from '@/features/imports/api/importsApi'
import { SavedViews } from '@/features/saved-views/SavedViews'

// Views, Export and Import for a list, all driven by the list's current URL (search, filters, sort).
export function ListTools({ resource, importable }: { resource: ExportResource; importable?: ImportResource }) {
  const [searchParams] = useSearchParams()
  const canView = useCan(`${resource === 'tickets' ? 'tickets' : resource}.view`)
  const canImport = useCan(`${importable ?? resource}.create`)
  const params = Object.fromEntries(searchParams)
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <SavedViews resource={resource} />
      {canView && <ExportButton resource={resource} params={params} />}
      {importable && canImport && <ImportButton resource={importable} noun={importable} />}
    </div>
  )
}
