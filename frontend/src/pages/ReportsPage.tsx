import { useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useUsers } from '@/hooks/useUsers'
import { buildExportUrl, firstDayOfMonthISO, todayISO } from '@/lib/utils'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { ReportsToolbar } from '@/components/reports/ReportsToolbar'
import type { MetricsFilters, TicketStatus } from '@/types'

export function ReportsPage() {
  const [from,           setFrom]           = useState<string>(firstDayOfMonthISO())
  const [to,             setTo]             = useState<string>(todayISO())
  const [statusFilter,   setStatusFilter]   = useState<TicketStatus[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)

  const filters: MetricsFilters = {
    from,
    to,
    status:      statusFilter,
    assignee_id: assigneeFilter,
  }

  const { data, isPending, isError, refetch } = useMetrics(filters)
  const { data: users = [] }                  = useUsers()

  function handleExport() {
    window.open(buildExportUrl(filters), '_blank')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f9f9fb]">
      {/* Header */}
      <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-5">
        <h1 className="text-xl font-semibold text-[#0c0e10]">Reports</h1>
      </div>

      {/* Toolbar */}
      <ReportsToolbar
        from={from}
        to={to}
        statusFilter={statusFilter}
        assigneeFilter={assigneeFilter}
        users={users}
        onFromChange={setFrom}
        onToChange={setTo}
        onStatusChange={setStatusFilter}
        onAssigneeChange={setAssigneeFilter}
        onExport={handleExport}
      />

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isPending && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e4e9ee] border-t-[#005bbf]" />
          </div>
        )}

        {isError && !isPending && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-[#acb3b8]">No se pudieron cargar las métricas.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!isPending && !isError && data && <MetricsGrid data={data} />}
      </div>
    </div>
  )
}
