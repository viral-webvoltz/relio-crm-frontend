import { format, parseISO } from 'date-fns'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { formatInvoiceNumber } from '@/features/invoices/types'
import { formatMoney } from '@/lib/money'
import { useListParams } from '@/lib/useListParams'
import type { PortalInvoice } from '../types'
import { usePortalInvoices } from '../hooks/usePortal'

const columns: Column<PortalInvoice>[] = [
  {
    key: 'invoice',
    header: 'Invoice',
    primary: true,
    cell: (invoice) => (
      <>
        <Link to={`/portal/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">{formatInvoiceNumber(invoice.invoiceNumber)}</Link>
        <div className="text-xs text-muted">Order #{invoice.orderNumber}</div>
      </>
    ),
  },
  { key: 'due', header: 'Due', cell: (invoice) => format(parseISO(invoice.dueDate), 'd MMM yyyy') },
  { key: 'status', header: 'Status', cell: (invoice) => <InvoiceStatusBadge invoice={invoice} /> },
  { key: 'total', header: 'Total', align: 'right', cell: (invoice) => formatMoney(invoice.totalMinor, invoice.currency) },
  { key: 'balance', header: 'Balance', align: 'right', cell: (invoice) => <span className="font-medium text-heading">{formatMoney(Math.max(0, invoice.totalMinor - invoice.paidMinor), invoice.currency)}</span> },
]

export function PortalInvoicesPage() {
  const { params, update } = useListParams()
  const { data, isPending, isFetching, isError, error, refetch } = usePortalInvoices(params.page)

  return (
    <>
      <PageHeader title="My invoices" subtitle="What you have been billed and what is still due." />
      <DataTable
        caption="My invoices"
        columns={columns}
        rows={data?.data}
        rowKey={(invoice) => invoice.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: FileText, title: 'No invoices yet', hint: 'Invoices for your orders will appear here.' }}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
      />
    </>
  )
}
