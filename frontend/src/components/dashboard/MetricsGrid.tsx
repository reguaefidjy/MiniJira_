import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import type { MetricsSnapshot, TicketStatus } from '@/types'

const STATUS_COLORS: Record<TicketStatus, string> = {
  todo: '#e4e9ee',
  in_progress: '#d7e2ff',
  review: '#fff3cd',
  done: '#69f6b8',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

interface Props {
  data: MetricsSnapshot
}

export function MetricsGrid({ data }: Props) {
  const byStatusData = (Object.entries(data.tickets_by_status) as [TicketStatus, number][]).map(
    ([status, count]) => ({
      name: STATUS_LABELS[status],
      count,
      color: STATUS_COLORS[status],
    }),
  )

  const closedByMonthData = data.tickets_closed_by_month.map((d) => ({
    name: d.month,
    count: d.count,
  }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Tickets por estado */}
      <div className="rounded-xl bg-white p-5" style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
          Tickets por estado
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie dataKey="count" data={byStatusData} cx="50%" cy="50%" outerRadius={70}>
              {byStatusData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [v, 'Tickets']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Tickets cerrados por mes */}
      <div className="rounded-xl bg-white p-5" style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
          Tickets cerrados por mes
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={closedByMonthData} barSize={24}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, 'Cerrados']} />
            <Bar dataKey="count" fill="#69f6b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tickets por miembro */}
      <div className="col-span-full rounded-xl bg-white p-5" style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[#acb3b8]">
          Carga de trabajo activa por miembro
        </p>
        <div className="flex flex-col gap-2">
          {data.tickets_by_member.map(({ user, active_count }) => (
            <div key={user.id} className="flex items-center gap-3">
              <span className="w-32 truncate text-sm text-[#0c0e10]">{user.name}</span>
              <div className="flex-1 rounded-full bg-[#f2f4f6]" style={{ height: 8 }}>
                <div
                  className="rounded-full bg-[#005bbf]"
                  style={{
                    height: 8,
                    width: `${Math.min(100, active_count * 10)}%`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <span className="w-6 text-right text-xs text-[#acb3b8]">{active_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
