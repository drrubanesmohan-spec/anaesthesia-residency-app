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

/* ─── Лечебное дело tab ─────────────────────────────────────────── */
interface GroupStat {
  id: string
  name: string
  specialty: string
  studentCount: number
}
interface LecturerStat { name: string; lectureCount: number }
interface LocationStat { name: string; usageCount: number }

const SPECIALTY_LABELS: Record<string, string> = {
  air: 'АиР', rb: 'РБ', ms: 'МС', kzh: 'КЖ',
}

function LechebnoeDeloTab() {
  const [groups,    setGroups]    = useState<GroupStat[]>([])
  const [lecturers, setLecturers] = useState<LecturerStat[]>([])
  const [locations, setLocations] = useState<LocationStat[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [gRecs, lRecs] = await Promise.all([
        pb.collection('student_groups').getFullList({ sort: 'start_date' }).catch(() => [] as Record<string, unknown>[]),
        pb.collection('roster_lectures').getFullList({ sort: 'date,start_time' }).catch(() => [] as Record<string, unknown>[]),
      ])
      if (cancelled) return

      // Groups + student count (from manually entered field)
      const groupStats: GroupStat[] = gRecs.map(g => ({
        id: g.id as string,
        name: g.name as string,
        specialty: (g.specialty as string) || '',
        studentCount: (g.student_count as number) || 0,
      }))

      // Lectures per lecturer
      const lecMap = new Map<string, number>()
      for (const l of lRecs) {
        const names = ((l.lecturer_name as string) || '').split(',').map((n: string) => n.trim()).filter(Boolean)
        for (const name of names) {
          lecMap.set(name, (lecMap.get(name) ?? 0) + 1)
        }
      }
      const lecStats: LecturerStat[] = Array.from(lecMap.entries())
        .map(([name, lectureCount]) => ({ name, lectureCount }))
        .sort((a, b) => b.lectureCount - a.lectureCount)

      // Location usage
      const locMap = new Map<string, number>()
      for (const l of lRecs) {
        const loc = (l.location as string) || ''
        if (loc) locMap.set(loc, (locMap.get(loc) ?? 0) + 1)
      }
      const locStats: LocationStat[] = Array.from(locMap.entries())
        .map(([name, usageCount]) => ({ name, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount)

      setGroups(groupStats)
      setLecturers(lecStats)
      setLocations(locStats)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="flex justify-center pt-10"><Spinner /></div>

  return (
    <div className="flex flex-col gap-5">

      {/* Groups */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Группы</h2>
        {groups.length === 0 ? (
          <p className="text-xs text-stone-400 italic">Нет групп</p>
        ) : (
          <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-3 py-2 font-semibold text-stone-500">Группа</th>
                  <th className="text-left px-3 py-2 font-semibold text-stone-500">Специальность</th>
                  <th className="text-right px-3 py-2 font-semibold text-stone-500">Студентов</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={g.id} className={i < groups.length - 1 ? 'border-b border-stone-100' : ''}>
                    <td className="px-3 py-2 font-medium text-stone-800">{g.name}</td>
                    <td className="px-3 py-2 text-stone-500">{SPECIALTY_LABELS[g.specialty] ?? (g.specialty || '—')}</td>
                    <td className="px-3 py-2 text-right font-semibold text-stone-700">{g.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lecturers */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Лекции по лектору</h2>
        {lecturers.length === 0 ? (
          <p className="text-xs text-stone-400 italic">Нет лекций</p>
        ) : (
          <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-3 py-2 font-semibold text-stone-500">Лектор</th>
                  <th className="text-right px-3 py-2 font-semibold text-stone-500">Лекций</th>
                </tr>
              </thead>
              <tbody>
                {lecturers.map((l, i) => (
                  <tr key={l.name} className={i < lecturers.length - 1 ? 'border-b border-stone-100' : ''}>
                    <td className="px-3 py-2 text-stone-800">{l.name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-stone-700">{l.lectureCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Locations */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Использование аудиторий</h2>
        {locations.length === 0 ? (
          <p className="text-xs text-stone-400 italic">Нет данных</p>
        ) : (
          <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-3 py-2 font-semibold text-stone-500">Аудитория</th>
                  <th className="text-right px-3 py-2 font-semibold text-stone-500">Раз использована</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={loc.name} className={i < locations.length - 1 ? 'border-b border-stone-100' : ''}>
                    <td className="px-3 py-2 text-stone-800">{loc.name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-stone-700">{loc.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}

type Tab = 'assignments' | 'daily' | 'lechebnoe'

export function AssignmentLogPage() {
  const { appUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'

  const [tab, setTab] = useState<Tab>('assignments')

  return (
    <AppShell title="Logs">
      {isAdmin && (
        <div className="mb-4 flex rounded-xl bg-brand-light p-1 gap-1">
          {([['assignments', 'Assignments'], ['daily', 'Daily Attendance'], ['lechebnoe', 'Леч. Дело']] as [Tab, string][]).map(([key, label]) => (
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

      {tab === 'assignments' ? <AssignmentLogTab /> : tab === 'daily' ? <DailyAttendanceLogTab /> : <LechebnoeDeloTab />}
    </AppShell>
  )
}
