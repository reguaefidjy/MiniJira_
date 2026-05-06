import type { MetricsFilters, MetricsSnapshot } from '@/types'

function buildMetricsParams(filters: MetricsFilters): string {
  const params = new URLSearchParams()
  params.set('from', filters.from)
  params.set('to', filters.to)
  filters.status.forEach((s) => params.append('status', s))
  if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
  return params.toString()
}

export async function fetchMetrics(filters: MetricsFilters): Promise<MetricsSnapshot> {
  const qs = buildMetricsParams(filters)
  const res = await fetch(`/api/metrics?${qs}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch metrics')
  return res.json()
}

/** Devuelve la URL lista para pasarla a window.location.href y disparar la descarga. */
export function getMetricsExportUrl(filters: MetricsFilters): string {
  const qs = buildMetricsParams(filters)
  return `/api/metrics/export?${qs}`
}
