import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import { commitImport, getImportJob, previewImport, validateImport, type ImportResource, type Mapping, type Preview, type Validation } from '../api/importsApi'

export const usePreviewImport = (resource: ImportResource) =>
  useMutation<Preview, ApiError, File>({ mutationFn: (file) => previewImport(resource, file) })

export const useValidateImport = (resource: ImportResource) =>
  useMutation<Validation, ApiError, { file: File; mapping: Mapping }>({ mutationFn: ({ file, mapping }) => validateImport(resource, file, mapping) })

export const useCommitImport = (resource: ImportResource) =>
  useMutation<string, ApiError, { file: File; mapping: Mapping }>({ mutationFn: ({ file, mapping }) => commitImport(resource, file, mapping) })

// Polls the import job every second until it finishes, then refreshes the resource's lists.
export function useImportJob(resource: ImportResource, jobId: string | null) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['imports', jobId],
    enabled: Boolean(jobId),
    queryFn: async ({ signal }) => {
      const job = await getImportJob(jobId!, signal)
      if (job.status === 'done') void queryClient.invalidateQueries({ queryKey: [resource] })
      return job
    },
    refetchInterval: (query) => (query.state.data?.status === 'done' || query.state.data?.status === 'failed' ? false : 1000),
  })
}
