import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { ConfirmHost } from '@/components/ui/ConfirmHost'
import { ResultsHost } from '@/components/ui/ResultsHost'
import { queryClient } from '@/lib/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors />
      <ConfirmHost />
      <ResultsHost />
    </QueryClientProvider>
  )
}
