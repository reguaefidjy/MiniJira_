import { useAppStore } from '@/store/useAppStore'
import { buildExportUrl } from '@/lib/utils'
import type { MetricsSnapshot } from '@/types'

interface Props {
  metrics: MetricsSnapshot | undefined
}

export function ExportButton({ metrics }: Props) {
  const metricsFilters = useAppStore((s) => s.metricsFilters)
  const isEmpty = !metrics || metrics.total === 0
  const url = buildExportUrl(metricsFilters)

  function handleExport() {
    window.location.href = url
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleExport}
        disabled={isEmpty}
        title={isEmpty ? 'No hay datos para el rango seleccionado' : undefined}
        className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        style={isEmpty ? {} : { background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
      >
        Exportar CSV
      </button>
    </div>
  )
}
