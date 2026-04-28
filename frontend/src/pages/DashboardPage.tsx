import { useAppStore } from '@/store/useAppStore'
import { useMetrics } from '@/hooks/useMetrics'
import { DashboardToolbar } from '@/components/dashboard/DashboardToolbar'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'

export function DashboardPage() {
  const metricsFilters = useAppStore((s) => s.metricsFilters)
  const { data, isLoading, isError } = useMetrics(metricsFilters)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0c0e10]">
          Dashboard
        </h1>
      </div>
      <DashboardToolbar metrics={data} />
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005bbf] border-t-transparent" />
        </div>
      )}
      {isError && (
        <p className="text-sm text-red-500">Error al cargar las métricas.</p>
      )}
      {data && <MetricsGrid data={data} />}
    </div>
  )
}
