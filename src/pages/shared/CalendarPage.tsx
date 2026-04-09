import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface DayMeta {
  present: number
  absent: number
  total: number
}

interface ResidentRecord {
  full_name: string
  status: 'present' | 'absent'
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function CalendarPage() {
  const { appUser } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based
  const [selected, setSelected] = useState(todayStr())
  const [dayMap, setDayMap] = useState<Record<string, DayMeta>>({})
  const [dayDetail, setDayDetail] = useState<ResidentRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [monthLoading, setMonthLoading] = useState(false)
  const [deptId, setDeptId] = useState<string | null | undefined>(undefined) // undefined=loading

  // Resolve dept scope
  useEffect(() => {
    if (!appUser) return
    if (appUser.role === 'admin') { setDeptId(null); return }
    if (appUser.role === 'supervisor') {
      supabase.from('supervisor_assignments')
        .select('department_id').eq('supervisor_id', appUser.id).single()
        .then(({ data }) => setDeptId(data?.department_id ?? null))
      return
    }
    // resident — use their own id as a signal; deptId not needed
    setDeptId(null)
  }, [appUser])

  // Load month attendance summary
  const loadMonth = useCallback(async () => {
    if (!appUser || deptId === undefined) return
    setMonthLoading(true)

    const firstDay = isoDate(year, month, 1)
    const lastDay = isoDate(year, month, new Date(year, month + 1, 0).getDate())

    let residentIds: string[] | null = null

    if (appUser.role === 'resident') {
      residentIds = [appUser.id]
    } else if (appUser.role === 'supervisor' && deptId) {
      const { data } = await supabase.from('resident_assignments')
        .select('resident_id').eq('department_id', deptId)
      residentIds = (data ?? []).map((r: { resident_id: string }) => r.resident_id)
    }
    // admin: residentIds stays null → no filter

    let query = supabase.from('daily_attendance')
      .select('resident_id, date, status')
      .gte('date', firstDay)
      .lte('date', lastDay)

    if (residentIds !== null) {
      if (residentIds.length === 0) { setDayMap({}); setMonthLoading(false); return }
      query = query.in('resident_id', residentIds)
    }

    const { data } = await query
    const map: Record<string, DayMeta> = {}
    for (const r of (data ?? []) as { resident_id: string; date: string; status: string }[]) {
      if (!map[r.date]) map[r.date] = { present: 0, absent: 0, total: 0 }
      map[r.date].total++
      if (r.status === 'present') map[r.date].present++
      else map[r.date].absent++
    }
    setDayMap(map)
    setMonthLoading(false)
  }, [appUser, deptId, year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  // Load detail for selected day
  const loadDetail = useCallback(async (date: string) => {
    if (!appUser || deptId === undefined) return
    setDetailLoading(true)

    let residentIds: string[] | null = null

    if (appUser.role === 'resident') {
      residentIds = [appUser.id]
    } else if (appUser.role === 'supervisor' && deptId) {
      const { data } = await supabase.from('resident_assignments')
        .select('resident_id').eq('department_id', deptId)
      residentIds = (data ?? []).map((r: { resident_id: string }) => r.resident_id)
    }

    let query = supabase.from('daily_attendance')
      .select('resident_id, status, profiles:resident_id(full_name)')
      .eq('date', date)

    if (residentIds !== null) {
      if (residentIds.length === 0) { setDayDetail([]); setDetailLoading(false); return }
      query = query.in('resident_id', residentIds)
    }

    const { data } = await query
    const records = ((data ?? []) as unknown as { status: string; profiles: { full_name: string } }[])
      .map(r => ({ full_name: r.profiles?.full_name ?? '—', status: r.status as 'present' | 'absent' }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    setDayDetail(records)
    setDetailLoading(false)
  }, [appUser, deptId])

  useEffect(() => { if (selected) loadDetail(selected) }, [loadDetail, selected])

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const today = todayStr()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function dotColor(meta: DayMeta) {
    if (meta.total === 0) return null
    const ratio = meta.present / meta.total
    if (ratio >= 0.8) return 'bg-emerald-400'
    if (ratio <= 0.3) return 'bg-red-400'
    return 'bg-amber-400'
  }

  const selectedLabel = selected
    ? new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  const selectedMeta = dayMap[selected]

  return (
    <AppShell title="Calendar">
      <div className="flex flex-col gap-4">

        {/* Month navigator */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-white">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* DOW headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DOW.map((d, i) => (
              <div key={i} className="flex justify-center">
                <span className="text-[10px] font-medium text-slate-500 w-8 text-center">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-2 pb-3 pt-1 relative">
            {monthLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-brand-light/60 rounded-b-2xl">
                <Spinner />
              </div>
            )}
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDow + 1
              if (dayNum < 1 || dayNum > daysInMonth) {
                return <div key={idx} className="h-10" />
              }
              const dateStr = isoDate(year, month, dayNum)
              const isToday = dateStr === today
              const isSelected = dateStr === selected
              const isFuture = dateStr > today
              const meta = dayMap[dateStr]
              const dot = meta ? dotColor(meta) : null

              return (
                <div key={idx} className="flex flex-col items-center py-0.5">
                  <button
                    onClick={() => !isFuture && setSelected(dateStr)}
                    disabled={isFuture}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : isToday
                        ? 'bg-slate-600 text-white'
                        : isFuture
                        ? 'text-slate-700 cursor-default'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    )}
                  >
                    {dayNum}
                  </button>
                  {/* dot */}
                  <div className="h-1.5 flex items-center justify-center mt-0.5">
                    {dot && !isFuture && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-[10px] text-slate-500">Mostly present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-[10px] text-slate-500">Mixed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span className="text-[10px] text-slate-500">Mostly absent</span>
            </div>
          </div>
        </div>

        {/* Selected day detail */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-xs font-semibold text-slate-300">{selectedLabel}</span>
            {selectedMeta && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-medium">{selectedMeta.present}P</span>
                <span className="text-slate-600">/</span>
                <span className="text-red-400 font-medium">{selectedMeta.absent}A</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{selectedMeta.total} total</span>
              </div>
            )}
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : dayDetail.length === 0 ? (
            <p className="px-4 py-4 text-xs text-slate-600 italic">No attendance recorded for this day.</p>
          ) : (
            <div>
              {dayDetail.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center px-4 py-2.5',
                    i !== dayDetail.length - 1 && 'border-b border-slate-700/40'
                  )}
                >
                  <span className="text-xs text-slate-500 w-6 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm text-white">{r.full_name}</span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    r.status === 'present'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  )}>
                    {r.status === 'present' ? 'Present' : 'Absent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
