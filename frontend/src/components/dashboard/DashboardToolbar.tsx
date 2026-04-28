import { ExportButton } from './ExportButton'
import type { MetricsSnapshot } from '@/types'

interface Props {
  metrics: MetricsSnapshot | undefined
}

export function DashboardToolbar({ metrics }: Props) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[#acb3b8]">
        Calculado en tiempo real sobre datos activos
      </p>
      <ExportButton metrics={metrics} />
    </div>
  )
}
