import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { pb } from '../../lib/pbClient'
import { ScrollText, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface AssignmentLog {
  id: string
  changed_at: string
  resident: { full_name: string } | null
  from_hospital: { name: string } | null
  from_dept: { name: string } | null
  to_hospital: { name: string } | null
  to_dept: { name: string } | null
  changer: { full_name: string } | null
}

interface DailyLog {
  id: string
  date: string
  marked_at: string
  status: 'present' | 'absent'
  resident: { full_name: string } | null
  marker: { full_name: string } | null
}

function AssignmentLogTab() {
  const [logs, setLogs] = useState<AssignmentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pb.collection('resident_assignment_logs').getFullList({
      sort: '-changed_at',
      expand: 'resident,from_hospital,from_department,to_hospital,to_department,changed_by',
    }).then(data => {
      setLogs(data.slice(0, 200).map(r => {
        const ex = r.expand as Record<string, Record<string, unknown>> | undefined
        return {
          id: r.id,
          changed_at: r.changed_at as string,
          resident: ex?.resident ? { full_name: ex.resident.full_name as string } : null,
          from_hospital: ex?.from_hospital ? { name: ex.from_hospital.name as string } : null,
          from_dept: ex?.from_department ? { name: ex.from_department.name as string } : null,
          to_hospital: ex?.to_hospital ? { name: ex.to_hospital.name as string } : null,
          to_dept: ex?.to_department ? { name: ex.to_department.name as string } : null,
          changer: ex?.changed_by ? { full_name: ex.changed_by.full_name as string } : null,
        }
      }))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-16"><Spinner /></div>
  if (logs.length === 0) return <EmptyState icon={ScrollText} title="No assignment changes yet" />

  return (
    <div className="space-y-2">
      {logs.map(l => {
        const fromLabel = l.from_hospital
          ? `${l.from_hospital.name}${l.from_dept ? ` / ${l.from_dept.name}` : ''}`
          : 'Unassigned'
        const toLabel = l.to_hospital
          ? `${l.to_hospital.name}${l.to_dept ? ` / ${l.to_dept.name}` : ''}`
          : '—'
        const date = new Date(l.changed_at)
        const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        return (
          <Card key={l.id} className="py-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-stone-900">{l.resident?.full_name ?? 'Unknown'}</p>
              <span className="shrink-0 text-xs text-stone-400">{dateStr} {timeStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-stone-400">{fromLabel}</span>
              <ArrowRight size={12} className="text-stone-400 shrink-0" />
              <span className="text-emerald-400">{toLabel}</span>
            </div>
            <p className="text-xs text-stone-400">by {l.changer?.full_name ?? 'Unknown'}</p>
          </Card>
        )
      })}
    </div>
  )
}

function DailyAttendanceLogTab() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all')

  useEffect(() => {
    pb.collection('daily_attendance_logs').getFullList({
      sort: '-marked_at',
      expand: 'resident,marked_by',
    }).then(data => {
      setLogs(data.slice(0, 500).map(r => {
        const ex = r.expand as Record<string, Record<string, unknown>> | undefined
        return {
          id: r.id,
          date: r.date as string,
          marked_at: r.marked_at as string,
          status: r.status as 'present' | 'absent',
          resident: ex?.resident ? { full_name: ex.resident.full_name as string } : null,
          marker: ex?.marked_by ? { full_name: ex.marked_by.full_name as string } : null,
        }
      }))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    if (filterDate && l.date !== filterDate) return false
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    return true
  })

  if (loading) return <div className="flex justify-center pt-16"><Spinner /></div>

  return (
    <>
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="bg-brand-light border border-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-500"
        />
        {(['all', 'present', 'absent'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filterStatus === s ? 'bg-brand-accent text-brand' : 'bg-brand-light text-stone-500 hover:text-stone-900'
            }`}
          >
            {s}
          </button>
        ))}
        {filterDate && (
          <button onClick={() => setFilterDate('')} className="text-xs text-stone-400 hover:text-stone-900">
            Clear date
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No records found" />
      ) : (
        <div className="space-y-2">
          {filtered.map(l => {
            const markedAt = new Date(l.marked_at)
            const timeStr = markedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            return (
              <Card key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{l.resident?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-stone-400">
                    {l.date} · {timeStr} · by {l.marker?.full_name ?? 'Unknown'}
                  </p>
                </div>
                {l.status === 'present' ? (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 size={11} /> Present
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">
                    <XCircle size={11} /> Absent
                  </span>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

type Tab = 'assignments' | 'daily'

export function AssignmentLogPage() {
  const { appUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'

  const [tab, setTab] = useState<Tab>('assignments')

  return (
    <AppShell title="Logs">
      {isAdmin && (
        <div className="mb-4 flex rounded-xl bg-brand-light p-1 gap-1">
          {([['assignments', 'Assignments'], ['daily', 'Daily Attendance']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                tab === key ? 'bg-brand-accent text-brand' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'assignments' ? <AssignmentLogTab /> : <DailyAttendanceLogTab />}
    </AppShell>
  )
}
