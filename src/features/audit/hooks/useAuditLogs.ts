import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAuditLogs, type AuditListParams } from '../api/auditApi'

export const useAuditLogs = (params: AuditListParams) =>
  useQuery({ queryKey: ['audit-logs', params], queryFn: ({ signal }) => getAuditLogs(params, signal), placeholderData: keepPreviousData })
