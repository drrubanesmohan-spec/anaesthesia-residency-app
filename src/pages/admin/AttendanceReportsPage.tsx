import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { AttendanceStatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { pb } from '../../lib/pbClient'
import { formatDate } from '../../lib/utils'
import { BarChart2 } from 'lucide-react'
import type { AttendanceStatus } from '../../types/domain'

interface ReportRow {
  id: string
  status: string
  marked_at: string | null
  sessions: { title: string; scheduled_date: string } | null
  profiles: { full_name: string } | null
}

export function AttendanceReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    pb.collection('attendance').getFullList({
      sort: '-marked_at',
      expand: 'session,resident',
    }).then(data => {
      setRows(data.slice(0, 100).map(r => ({
        id: r.id,
        status: r.status as string,
        marked_at: r.marked_at as string | null,
        sessions: r.expand?.session
          ? { title: (r.expand.session as Record<string, unknown>).title as string, scheduled_date: (r.expand.session as Record<string, unknown>).scheduled_date as string }
          : null,
        profiles: r.expand?.resident
          ? { full_name: (r.expand.resident as Record<string, unknown>).full_name as string }
          : null,
      })))
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <AppShell title="Reports">
      <div className="mb-4 flex gap-2 flex-wrap">
        {['all', 'present', 'absent', 'late', 'excused'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-brand-accent text-brand' : 'bg-brand-light text-stone-500 hover:text-stone-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BarChart2} title="No records" />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-stone-900">
                  {r.profiles?.full_name ?? 'Unknown'}
                </p>
                <p className="truncate text-xs text-stone-400">
                  {r.sessions?.title ?? '—'} · {r.sessions?.scheduled_date ? formatDate(r.sessions.scheduled_date) : ''}
                </p>
              </div>
              <AttendanceStatusBadge status={r.status as AttendanceStatus} />
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
