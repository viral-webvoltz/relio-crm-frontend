import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getDashboardSummary, type DashboardRange } from '../api/dashboardApi'

export const useDashboardSummary = (range: DashboardRange) =>
  useQuery({ queryKey: ['dashboard', 'summary', range], queryFn: ({ signal }) => getDashboardSummary(range, signal), placeholderData: keepPreviousData })
