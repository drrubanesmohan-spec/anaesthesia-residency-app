import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { pb } from '../../lib/pbClient'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DeptInfo { hospital_name: string; dept_name: string }
interface AttendanceSummary { present: number; absent: number; total: number }
interface Lecture { id: string; date: string; title: string; start_time: string; location: string; group_name: string }

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function miniIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function SupervisorHome() {
  const { appUser } = useAuth()
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)

  const [deptInfo, setDeptInfo]   = useState<DeptInfo | null>(null)
  const [summary, setSummary]     = useState<AttendanceSummary | null>(null)
  const [year,  setYear]          = useState(now.getFullYear())
  const [month, setMonth]         = useState(now.getMonth())
  const [lectures, setLectures]   = useState<Lecture[]>([])
  const [selected, setSelected]   = useState(today)

  useEffect(() => {
    if (!appUser) return
    async function load() {
      if (!appUser) return
      const sa = await pb.collection('supervisor_assignments').getFirstListItem(
        `supervisor = '${appUser.id}'`,
        { expand: 'hospital,department' }
      ).catch(() => null)
      if (!sa) return
      const expanded = sa.expand as Record<string, Record<string, unknown>> | undefined
      setDeptInfo({
        hospital_name: expanded?.hospital?.name as string ?? '',
        dept_name:     expanded?.department?.name as string ?? '',
      })
      const deptId = sa.department as string
      if (!deptId) return
      const residentAssignments = await pb.collection('resident_assignments').getFullList({
        filter: `department = '${deptId}'`,
      })
      const ids = residentAssignments.map(r => r.resident as string)
      if (ids.length === 0) return
      const attRecords = await pb.collection('daily_attendance').getFullList({
        filter: `date = '${today}'`,
      })
      const relevant = attRecords.filter(a => ids.includes(a.resident as string))
      const present = relevant.filter(a => a.status === 'present').length
      const absent  = relevant.filter(a => a.status === 'absent').length
      setSummary({ present, absent, total: ids.length })
    }
    load()
  }, [appUser, today])

  useEffect(() => {
    if (!appUser?.fullName) return
    const first = miniIso(year, month, 1)
    const last  = miniIso(year, month, new Date(year, month + 1, 0).getDate())
    // Use ~ (contains) to handle multi-lecturer entries
    const name = appUser.fullName.replace(/'/g, "''")
    pb.collection('roster_lectures').getFullList({
      filter: `date >= '${first}' && date <= '${last}' && lecturer_name ~ '${name}'`,
      sort: 'date,start_time',
    }).catch(() => []).then(recs =>
      setLectures((recs as { id: string; date: string; title: string; start_time: string; location: string; group_name: string }[])
        .map(r => ({ id: r.id, date: r.date, title: r.title, start_time: r.start_time, location: r.location, group_name: r.group_name })))
    )
  }, [appUser, year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const monthLabel  = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const lectureDates   = new Set(lectures.map(l => l.date))
  const selectedLectures = lectures.filter(l => l.date === selected)

  const selectedLabel = new Date(selected + 'T00:00:00').toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  return (
    <AppShell title="Home" showLogout>
      <div className="space-y-4">
        {/* Greeting */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-5 py-4">
          <p className="text-xs text-stone-400 mb-1">{greeting}</p>
          <p className="text-lg font-semibold text-stone-900">{appUser?.fullName ?? ''}</p>
          {deptInfo ? (
            <p className="text-xs text-emerald-400 mt-1">{deptInfo.hospital_name} · {deptInfo.dept_name}</p>
          ) : (
            <p className="text-xs text-stone-400 mt-1 italic">No department assigned</p>
          )}
        </div>

        {/* Today's attendance summary */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-3">
            Today's Attendance · {today}
          </p>
          {summary ? (
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-emerald-400">{summary.present}</p>
                <p className="text-xs text-stone-400 mt-0.5">Present</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-red-400">{summary.absent}</p>
                <p className="text-xs text-stone-400 mt-0.5">Absent</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-stone-500">{summary.total - summary.present - summary.absent}</p>
                <p className="text-xs text-stone-400 mt-0.5">Unmarked</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">No attendance data yet today.</p>
          )}
        </div>

        {/* Lecture calendar */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <button onClick={prevMonth} className="p-1 rounded-full hover:bg-stone-100 text-stone-400 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-stone-800 capitalize">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 rounded-full hover:bg-stone-100 text-stone-400 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* DOW labels */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DOW_SHORT.map((d, i) => (
              <div key={i} className="flex justify-center">
                <span className="text-[9px] font-medium text-stone-400">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDow + 1
              if (dayNum < 1 || dayNum > daysInMonth) return <div key={idx} />
              const dateStr    = miniIso(year, month, dayNum)
              const isToday    = dateStr === today
              const isSelected = dateStr === selected
              const hasLecture = lectureDates.has(dateStr)
              const isSunday   = new Date(dateStr + 'T00:00:00').getDay() === 0
              return (
                <button
                  key={idx}
                  onClick={() => !isSunday && setSelected(dateStr)}
                  className={cn(
                    'flex flex-col items-center py-1 rounded-lg transition-colors',
                    isSunday ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-stone-100',
                    isSelected && !isSunday && 'bg-brand-accent/10',
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium',
                    isSelected && !isSunday ? 'bg-brand-accent text-white' :
                    isToday ? 'ring-1 ring-brand-accent text-brand-accent' :
                    isSunday ? 'text-red-400' : 'text-stone-700',
                  )}>
                    {dayNum}
                  </span>
                  {hasLecture && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-brand-accent mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day lectures */}
          <div className="border-t border-stone-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-stone-400 capitalize mb-2">{selectedLabel}</p>
            {selectedLectures.length === 0 ? (
              <p className="text-[11px] text-stone-300 italic">Нет лекций</p>
            ) : (
              <div className="space-y-2">
                {selectedLectures.map(l => (
                  <div key={l.id} className="rounded-lg bg-brand-accent/5 border border-brand-accent/20 px-3 py-2">
                    <p className="text-[12px] font-medium text-stone-800 leading-tight">{l.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {l.start_time && (
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <Clock size={10} />
                          {l.start_time}
                        </span>
                      )}
                      {l.location && (
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <MapPin size={10} />
                          {l.location}
                        </span>
                      )}
                      {l.group_name && (
                        <span className="text-[10px] text-stone-400">{l.group_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
