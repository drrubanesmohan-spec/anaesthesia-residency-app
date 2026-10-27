import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────── */
interface RosterLecture {
  id: string; title: string; lecturer_name: string; group_name: string
  date: string; start_time: string; color: string; notes: string; location: string
}
interface Group {
  id: string; name: string; start_date: string; end_date: string; specialty: string
}

const SPECIALTIES = [
  { id: 'air',  label: 'Анестезиология и реаниматология', abbr: 'АиР', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'    },
  { id: 'rb',   label: 'Реабилитация',                    abbr: 'РБ',  bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { id: 'ms',   label: 'Медсестры',                       abbr: 'МС',  bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-400'    },
  { id: 'kzh',  label: 'Кружок',                          abbr: 'КЖ',  bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400'   },
]
const specialtyFor = (id: string) => SPECIALTIES.find(s => s.id === id) ?? null

const COLORS = [
  { id: 'blue',   dot: 'bg-blue-400'    },
  { id: 'purple', dot: 'bg-purple-400'  },
  { id: 'green',  dot: 'bg-emerald-400' },
  { id: 'orange', dot: 'bg-orange-400'  },
  { id: 'pink',   dot: 'bg-pink-400'    },
  { id: 'amber',  dot: 'bg-amber-400'   },
]
const colorDot = (id: string) => (COLORS.find(c => c.id === id) ?? COLORS[0]).dot

const DOW_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

interface LocationEntry { id: string; name: string }

export function SupervisorLecturesPage() {
  const [lectures,    setLectures]    = useState<RosterLecture[]>([])
  const [allLectures, setAllLectures] = useState<RosterLecture[]>([])
  const [groups,      setGroups]      = useState<Group[]>([])
  const [locations,   setLocations]   = useState<LocationEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())
  const [filterLocation, setFilterLocation] = useState('')
  const [filterSpec,     setFilterSpec]     = useState('')

  useEffect(() => {
    Promise.all([
      pb.collection('student_groups').getFullList({ sort: 'start_date' }).catch(() => []),
      pb.collection('app_settings').getFullList({ filter: "key='locations'" }).catch(() => []),
      pb.collection('roster_lectures').getFullList({ sort: 'date,start_time' }),
    ]).then(([gRecs, locRecs, allRecs]) => {
      setGroups(gRecs.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        start_date: (r.start_date as string) || '',
        end_date: (r.end_date as string) || '',
        specialty: (r.specialty as string) || '',
      })))
      try {
        const saved = (locRecs[0] as { value?: string } | undefined)?.value
        if (saved) setLocations(JSON.parse(saved) as LocationEntry[])
      } catch { /* ignore */ }
      setAllLectures(allRecs.map(mapLecture))
      setLoading(false)
    })
  }, [])

  // Load lectures for the current month (for calendar dots / selected-day list)
  useEffect(() => {
    const firstDay = isoDate(year, month, 1)
    const lastDay  = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    pb.collection('roster_lectures').getFullList({
      filter: `date >= '${firstDay}' && date <= '${lastDay}'`,
      sort: 'date,start_time',
    }).then(recs => setLectures(recs.map(mapLecture)))
  }, [year, month])

  function mapLecture(r: Record<string, unknown>): RosterLecture {
    return {
      id: r.id as string,
      title: (r.title as string) || '',
      lecturer_name: (r.lecturer_name as string) || '',
      group_name: (r.group_name as string) || '',
      location: (r.location as string) || '',
      date: r.date as string,
      start_time: (r.start_time as string) || '',
      color: (r.color as string) || 'blue',
      notes: (r.notes as string) || '',
    }
  }

  // Calendar helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const today       = todayStr()
  const monthLabel  = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const selectedLabel = new Date(selected + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function lecturesForDay(date: string) {
    return lectures
      .filter(l => l.date === date)
      .filter(l => !filterLocation || l.location === filterLocation)
      .filter(l => !filterSpec || (() => {
        // match by group's specialty
        const g = groups.find(g => g.name === l.group_name)
        return g?.specialty === filterSpec
      })())
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const filteredGroups = groups.filter(g => {
    if (filterSpec && g.specialty !== filterSpec) return false
    if (filterLocation) {
      const hasLocLecture = allLectures.some(l => l.group_name === g.name && l.location === filterLocation)
      if (!hasLocLecture) return false
    }
    return true
  })

  const selectedLectures = lecturesForDay(selected)

  const monthFirstDate = isoDate(year, month, 1)
  const monthLastDate  = isoDate(year, month, daysInMonth)

  if (loading) return (
    <AppShell title="Расписание лекций">
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Расписание лекций">
      <div className="flex flex-col gap-3">

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterSpec}
            onChange={e => setFilterSpec(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-brand-light px-2 py-1 text-[11px] text-stone-700 focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <option value="">Все специальности</option>
            {SPECIALTIES.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.abbr} — {sp.label}</option>
            ))}
          </select>
          {locations.length > 0 && (
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-brand-light px-2 py-1 text-[11px] text-stone-700 focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">Все аудитории</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Month calendar */}
        <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-2 py-2 border-b border-stone-200">
            <button onClick={prevMonth} className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] font-semibold text-stone-900 capitalize">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 pt-2 pb-0.5">
            {DOW_RU.map((d, i) => (
              <div key={i} className="flex justify-center">
                <span className="text-[8px] font-medium text-stone-400">{d}</span>
              </div>
            ))}
          </div>

          {/* Weeks with group bars */}
          <div className="pb-2">
            {Array.from({ length: Math.ceil(totalCells / 7) }).map((_, weekIdx) => {
              const weekFirstCell = weekIdx * 7

              const bars = filteredGroups.flatMap((g, _gi) => {
                const effStart = g.start_date
                  ? (g.start_date < monthFirstDate ? monthFirstDate : g.start_date)
                  : monthFirstDate
                const effEnd = g.end_date
                  ? (g.end_date > monthLastDate ? monthLastDate : g.end_date)
                  : monthLastDate
                if (effStart > monthLastDate || effEnd < monthFirstDate) return []
                const startDay = parseInt(effStart.split('-')[2])
                const endDay   = parseInt(effEnd.split('-')[2])
                const gStartCell = firstDow + startDay - 1
                const gEndCell   = firstDow + endDay   - 1
                const barStart = Math.max(gStartCell, weekFirstCell)
                const barEnd   = Math.min(gEndCell,   weekFirstCell + 6)
                if (barStart > barEnd) return []
                const sp = specialtyFor(g.specialty)
                return [{ id: g.id, name: g.name, dot: sp ? sp.dot : 'bg-stone-400',
                  startCol: barStart - weekFirstCell, endCol: barEnd - weekFirstCell,
                  isStart: gStartCell === barStart && (!g.start_date || g.start_date >= monthFirstDate),
                  isEnd:   gEndCell   === barEnd   && (!g.end_date   || g.end_date   <= monthLastDate),
                }]
              })

              return (
                <div key={weekIdx}>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: 7 }).map((_, col) => {
                      const cellIdx = weekFirstCell + col
                      const dayNum  = cellIdx - firstDow + 1
                      if (dayNum < 1 || dayNum > daysInMonth) return <div key={col} />
                      const dateStr = isoDate(year, month, dayNum)
                      const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0
                      const isSelected = dateStr === selected
                      const isToday = dateStr === today
                      return (
                        <div
                          key={col}
                          onClick={isSunday ? undefined : () => setSelected(dateStr)}
                          className={cn(
                            'flex flex-col items-center py-1 transition-colors min-h-[36px]',
                            isSunday
                              ? 'opacity-35 cursor-not-allowed'
                              : isSelected
                              ? 'bg-brand-accent/10 ring-1 ring-brand-accent/40 cursor-pointer rounded-lg'
                              : 'hover:bg-stone-50 cursor-pointer',
                          )}
                        >
                          <span className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
                            isSunday ? 'text-red-400'
                              : isSelected ? 'bg-brand-accent text-white'
                              : isToday ? 'ring-1 ring-blue-400 text-blue-400'
                              : 'text-stone-700',
                          )}>
                            {dayNum}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {bars.length > 0 && (
                    <div className="relative" style={{ height: bars.length * 12 + 2 }}>
                      {bars.map((bar, bi) => (
                        <div
                          key={bar.id}
                          className={cn('absolute flex items-center overflow-hidden', bar.dot)}
                          style={{
                            left:   `${bar.startCol / 7 * 100}%`,
                            width:  `${(bar.endCol - bar.startCol + 1) / 7 * 100}%`,
                            top:    bi * 12 + 1,
                            height: 10,
                            borderLeft:  bar.isStart ? '3px solid #111' : 'none',
                            borderRight: bar.isEnd   ? '3px solid #111' : 'none',
                            borderRadius: bar.isStart && bar.isEnd ? 2 : bar.isStart ? '2px 0 0 2px' : bar.isEnd ? '0 2px 2px 0' : 0,
                          }}
                        >
                          <div className="flex w-full justify-around px-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-[7px] font-bold text-white leading-none opacity-90">{bar.name}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day detail (read-only) */}
        <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
          <div className="px-3 py-2 border-b border-stone-200">
            <span className="text-[10px] font-semibold text-stone-600 capitalize">{selectedLabel}</span>
          </div>
          {selectedLectures.length === 0 ? (
            <p className="px-3 py-3 text-[10px] text-stone-400 italic">Нет лекций на этот день.</p>
          ) : (
            <div>
              {selectedLectures.map((lec, i) => (
                <div
                  key={lec.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2',
                    i < selectedLectures.length - 1 && 'border-b border-stone-100',
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', colorDot(lec.color))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-stone-900 truncate">{lec.title}</p>
                    {(lec.start_time || lec.lecturer_name) && (
                      <p className="text-[10px] text-stone-400 truncate">
                        {lec.start_time ? `${lec.start_time} · ` : ''}{lec.lecturer_name}
                      </p>
                    )}
                    {lec.location && (
                      <p className="text-[10px] text-stone-400 truncate flex items-center gap-0.5">
                        <MapPin size={8} className="shrink-0" />{lec.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-group timetables (read-only) */}
        {groups
          .filter(g =>
            (!g.start_date || g.start_date <= selected) &&
            (!g.end_date   || g.end_date   >= selected)
          )
          .map(group => {
            const sp = specialtyFor(group.specialty)
            const groupLectures = [...allLectures]
              .filter(l => l.group_name === group.name)
              .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
            if (groupLectures.length === 0) return null
            return (
              <div key={group.id} className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className={cn('px-3 py-2 border-b border-stone-200 flex items-center gap-2', sp ? sp.bg : '')}>
                  {sp && <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md', sp.bg, sp.text)}>{sp.abbr}</span>}
                  <span className={cn('text-[10px] font-semibold flex-1', sp ? sp.text : 'text-stone-600')}>{group.name}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left px-2 py-1.5 text-stone-400 font-semibold whitespace-nowrap">Дата</th>
                        <th className="text-left px-2 py-1.5 text-stone-400 font-semibold">Тема</th>
                        <th className="text-left px-2 py-1.5 text-stone-400 font-semibold">Место</th>
                        <th className="text-left px-2 py-1.5 text-stone-400 font-semibold">Преподаватель</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupLectures.map((lec, i, arr) => {
                        const d = new Date(lec.date + 'T00:00:00')
                        return (
                          <tr
                            key={lec.id}
                            onClick={() => setSelected(lec.date)}
                            className={cn(
                              'cursor-pointer hover:bg-stone-50 transition-colors',
                              i < arr.length - 1 && 'border-b border-stone-100',
                              lec.date === selected && 'bg-brand-accent/5',
                            )}
                          >
                            <td className="px-2 py-1.5 align-top shrink-0">
                              <div className="flex items-center gap-1">
                                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-px', colorDot(lec.color))} />
                                <span className="font-semibold text-stone-700 whitespace-nowrap">
                                  {d.getDate()} {DOW_RU[(d.getDay() + 6) % 7]}
                                </span>
                              </div>
                              {lec.start_time && (
                                <p className="text-stone-400 pl-2.5">{lec.start_time}</p>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-stone-800 font-medium leading-tight align-top">
                              <p className="line-clamp-3">{lec.title}</p>
                            </td>
                            <td className="px-2 py-1.5 text-stone-500 leading-tight align-top">
                              <p className="line-clamp-3">{lec.location || '—'}</p>
                            </td>
                            <td className="px-2 py-1.5 text-stone-500 leading-tight align-top">
                              <p className="line-clamp-3">{lec.lecturer_name || '—'}</p>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
      </div>
    </AppShell>
  )
}
