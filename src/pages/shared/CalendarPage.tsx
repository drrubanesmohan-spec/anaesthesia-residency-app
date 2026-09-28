import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, ChevronDown, BookOpen } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface CalendarEvent {
  id: string
  title: string
  date: string
  end_date: string | null
  description: string | null
  created_by: string | null
}

interface TimetableEvent {
  id: string
  title: string
  date: string
  groupName: string
}

interface GroupSchedule {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  timetable: { id: string; day_of_week: number; subject: string }[]
}

interface LectureEvent {
  id: string
  title: string
  date: string
  start_time: string
  lecturer_name: string
  color: string
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const SS_YEAR     = 'cal_year'
const SS_MONTH    = 'cal_month'
const SS_SELECTED = 'cal_selected'
const SS_EVENTS   = 'cal_events_'
const SS_DRAFT_T  = 'cal_draft_title'
const SS_DRAFT_D  = 'cal_draft_desc'
const SS_DRAFT_ED = 'cal_draft_enddate'
const SS_MODAL    = 'cal_modal_open'

function ss(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
function ssSet(key: string, val: string) {
  try { sessionStorage.setItem(key, val) } catch { /* quota */ }
}
function ssRemove(key: string) {
  try { sessionStorage.removeItem(key) } catch { /* */ }
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

/* ─── Add event modal ─────────────────────────────────────────────── */

function AddEventModal({
  date,
  onClose,
  onSaved,
}: {
  date: string
  onClose: () => void
  onSaved: (event: CalendarEvent) => void
}) {
  const { appUser } = useAuth()
  const [title,   setTitle]   = useState(() => ss(SS_DRAFT_T)  ?? '')
  const [endDate, setEndDate] = useState(() => ss(SS_DRAFT_ED) ?? date)
  const [desc,    setDesc]    = useState(() => ss(SS_DRAFT_D)  ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function handleTitle(v: string)   { setTitle(v);   ssSet(SS_DRAFT_T, v) }
  function handleDesc(v: string)    { setDesc(v);    ssSet(SS_DRAFT_D, v) }
  function handleEndDate(v: string) {
    const safe = v < date ? date : v
    setEndDate(safe)
    ssSet(SS_DRAFT_ED, safe)
  }

  const startLabel = new Date(date    + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const endLabel   = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const isMultiDay = endDate !== date

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      const rec = await pb.collection('calendar_events').create({
        title: title.trim(),
        date,
        end_date: endDate !== date ? endDate : null,
        description: desc.trim() || null,
        created_by: appUser?.id,
      })
      ssRemove(SS_DRAFT_T); ssRemove(SS_DRAFT_D); ssRemove(SS_DRAFT_ED); ssRemove(SS_MODAL)
      onSaved({
        id: rec.id,
        title: rec.title as string,
        date: rec.date as string,
        end_date: rec.end_date as string | null,
        description: rec.description as string | null,
        created_by: rec.created_by as string | null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  function handleClose() {
    ssRemove(SS_MODAL)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-stone-500">New Event</span>
          <button onClick={handleClose} className="text-stone-500 hover:text-stone-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Title"
            value={title}
            onChange={e => handleTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="rounded-xl bg-stone-100 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-stone-300">
              <span className="text-xs text-stone-500 w-14 shrink-0">Starts</span>
              <span className="flex-1 text-sm text-stone-900">{startLabel}</span>
              <span className="text-xs text-stone-400 italic">selected day</span>
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-stone-500 w-14 shrink-0">Ends</span>
              <span className="flex-1 text-sm text-stone-900">{isMultiDay ? endLabel : startLabel}</span>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={e => handleEndDate(e.target.value)}
                className="text-xs text-blue-400 font-medium bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={desc}
            onChange={e => handleDesc(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-stone-900 hover:bg-brand-accent/80 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Calendar page ──────────────────────────────────────────────── */

const LECTURE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  green:  { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-400'},
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   dot: 'bg-pink-400'   },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
}
function lectureColor(id: string) { return LECTURE_COLORS[id] ?? LECTURE_COLORS.blue }

export function CalendarPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'supervisor'
  const isAdmin = appUser?.role === 'admin'

  const now = new Date()

  const [year,     setYearRaw]     = useState<number>(() => parseInt(ss(SS_YEAR)  ?? String(now.getFullYear())))
  const [month,    setMonthRaw]    = useState<number>(() => parseInt(ss(SS_MONTH) ?? String(now.getMonth())))
  const [selected, setSelectedRaw] = useState<string>(() => ss(SS_SELECTED) ?? todayStr())
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const cached = ss(SS_EVENTS + monthKey(
      parseInt(ss(SS_YEAR)  ?? String(now.getFullYear())),
      parseInt(ss(SS_MONTH) ?? String(now.getMonth()))
    ))
    return cached ? (JSON.parse(cached) as CalendarEvent[]) : []
  })
  const [loading,    setLoading]    = useState(events.length === 0)
  const [showModal,  setShowModal]  = useState(() => ss(SS_MODAL) === '1')
  const [showPicker, setShowPicker] = useState(false)
  const [pickYear,   setPickYear]   = useState(year)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [groups,     setGroups]     = useState<GroupSchedule[]>([])
  const [lectures,   setLectures]   = useState<LectureEvent[]>([])

  function setYear(y: number)     { setYearRaw(y);  ssSet(SS_YEAR, String(y)) }
  function setMonth(m: number)    { setMonthRaw(m); ssSet(SS_MONTH, String(m)) }
  function setSelected(d: string) { setSelectedRaw(d); ssSet(SS_SELECTED, d) }

  function openModal()  { ssSet(SS_MODAL, '1'); setShowModal(true) }
  function closeModal() { ssRemove(SS_MODAL);   setShowModal(false) }

  const isFetching = useRef(false)
  const loadMonth = useCallback(async () => {
    if (isFetching.current) return
    isFetching.current = true
    const firstDay = isoDate(year, month, 1)
    const lastDay  = isoDate(year, month, new Date(year, month + 1, 0).getDate())

    const [eventsData, groupsData, ttData, lecturesData] = await Promise.all([
      pb.collection('calendar_events').getFullList({
        filter: `date <= '${lastDay}' && (end_date = '' || end_date = null || end_date >= '${firstDay}')`,
        sort: 'date',
      }),
      pb.collection('student_groups').getFullList({
        filter: "start_date != ''",
      }),
      pb.collection('group_timetable').getFullList(),
      pb.collection('roster_lectures').getFullList({
        filter: `date >= '${firstDay}' && date <= '${lastDay}'`,
        sort: 'date,start_time',
      }).catch(() => []),
    ])

    const fresh: CalendarEvent[] = eventsData.map(r => ({
      id: r.id,
      title: r.title as string,
      date: r.date as string,
      end_date: r.end_date as string | null,
      description: r.description as string | null,
      created_by: r.created_by as string | null,
    }))
    setEvents(fresh)
    ssSet(SS_EVENTS + monthKey(year, month), JSON.stringify(fresh))

    const gs: GroupSchedule[] = groupsData.map(g => ({
      id: g.id,
      name: g.name as string,
      start_date: g.start_date as string | null,
      end_date: g.end_date as string | null,
      timetable: ttData
        .filter(t => t.group === g.id)
        .map(t => ({ id: t.id, day_of_week: t.day_of_week as number, subject: t.subject as string })),
    }))
    setGroups(gs)

    setLectures(lecturesData.map(l => ({
      id: l.id,
      title: l.title as string,
      date: l.date as string,
      start_time: (l.start_time as string) || '',
      lecturer_name: (l.lecturer_name as string) || '',
      color: (l.color as string) || 'blue',
    })))

    setLoading(false)
    isFetching.current = false
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') loadMonth()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadMonth])

  const eventDates = new Set<string>()
  for (const ev of events) {
    const start = ev.date
    const end   = ev.end_date ?? ev.date
    const cur   = new Date(start + 'T00:00:00')
    const last  = new Date(end   + 'T00:00:00')
    while (cur <= last) {
      eventDates.add(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
  }

  const timetableDates = new Set<string>()
  const timetableByDate = new Map<string, TimetableEvent[]>()
  const daysInMonthForTT = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonthForTT; d++) {
    const dateStr = isoDate(year, month, d)
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const hits: TimetableEvent[] = []
    for (const g of groups) {
      if (g.start_date && dateStr < g.start_date) continue
      if (g.end_date   && dateStr > g.end_date)   continue
      for (const tt of g.timetable) {
        if (tt.day_of_week === dow) {
          hits.push({ id: `tt-${g.id}-${tt.id}`, title: tt.subject, date: dateStr, groupName: g.name })
        }
      }
    }
    if (hits.length > 0) {
      timetableDates.add(dateStr)
      timetableByDate.set(dateStr, hits)
    }
  }

  const lectureDates = new Set(lectures.map(l => l.date))
  const selectedLectures = lectures.filter(l => l.date === selected).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const selectedEvents = events.filter(e => {
    const end = e.end_date ?? e.date
    return e.date <= selected && end >= selected
  })
  const selectedTimetableEvents = timetableByDate.get(selected) ?? []

  async function deleteEvent(id: string) {
    setDeleting(id)
    await pb.collection('calendar_events').delete(id)
    const updated = events.filter(e => e.id !== id)
    setEvents(updated)
    ssSet(SS_EVENTS + monthKey(year, month), JSON.stringify(updated))
    setDeleting(null)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const today       = todayStr()

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedLabel = new Date(selected + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <AppShell title="Calendar">
      <div className="flex flex-col gap-4">

        {isAdmin && (
          <button
            onClick={() => navigate('/admin/lectures')}
            className="flex items-center justify-between w-full rounded-2xl bg-purple-600 px-4 py-3.5 text-left transition-opacity active:opacity-80"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Расписание лекций</p>
                <p className="text-xs text-purple-200 mt-0.5">Управление лекциями и лекторами</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-purple-300 shrink-0" />
          </button>
        )}

        <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-600"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => { setPickYear(year); setShowPicker(v => !v) }}
              className="flex items-center gap-1 text-sm font-semibold text-stone-900 hover:text-blue-300 transition-colors"
            >
              {monthLabel}
              <ChevronDown size={14} className={cn('transition-transform', showPicker && 'rotate-180')} />
            </button>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {showPicker && (
            <div className="border-b border-stone-200 px-3 pt-3 pb-4 bg-stone-100">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPickYear(y => y - 1)}
                  className="p-1 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-stone-900">{pickYear}</span>
                <button
                  onClick={() => setPickYear(y => y + 1)}
                  className="p-1 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
                  const isCurrent = pickYear === year && i === month
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setYear(pickYear)
                        setMonth(i)
                        setShowPicker(false)
                      }}
                      className={cn(
                        'rounded-lg py-1.5 text-xs font-medium transition-colors',
                        isCurrent
                          ? 'bg-brand-accent text-white'
                          : 'text-stone-600 hover:bg-stone-200'
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 px-2 pt-3">
            {DOW.map((d, i) => (
              <div key={i} className="flex justify-center">
                <span className="text-[10px] font-medium text-stone-400 w-8 text-center">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-2 pb-4 pt-1 relative min-h-[10rem]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-brand-light/70 rounded-b-2xl">
                <Spinner />
              </div>
            )}
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDow + 1
              if (dayNum < 1 || dayNum > daysInMonth) return <div key={idx} className="h-10" />
              const dateStr   = isoDate(year, month, dayNum)
              const isToday   = dateStr === today
              const isSel     = dateStr === selected
              const hasEvent      = eventDates.has(dateStr)
              const hasTimetable  = timetableDates.has(dateStr)
              const hasLecture    = lectureDates.has(dateStr)
              return (
                <div key={idx} className="flex flex-col items-center py-0.5">
                  <button
                    onClick={() => setSelected(dateStr)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isSel   ? 'bg-brand-accent text-white'
                      : isToday ? 'ring-1 ring-blue-400 text-blue-300'
                      : 'text-stone-600 hover:bg-stone-100'
                    )}
                  >
                    {dayNum}
                  </button>
                  <div className="h-1.5 flex items-center justify-center gap-0.5 mt-0.5">
                    {hasEvent && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSel ? 'bg-white' : 'bg-blue-400')} />
                    )}
                    {hasTimetable && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSel ? 'bg-white/70' : 'bg-brand-accent/70')} />
                    )}
                    {hasLecture && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSel ? 'bg-white' : 'bg-purple-400')} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <span className="text-xs font-semibold text-stone-600">{selectedLabel}</span>
            {canEdit && (
              <button
                onClick={openModal}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          {selectedEvents.length === 0 && selectedTimetableEvents.length === 0 && selectedLectures.length === 0 ? (
            <p className="px-4 py-4 text-xs text-stone-400 italic">No events on this day.</p>
          ) : (
            <div>
              {selectedLectures.map((lec, i) => {
                const c = lectureColor(lec.color)
                const hasNext = i < selectedLectures.length - 1 || selectedTimetableEvents.length > 0 || selectedEvents.length > 0
                return (
                  <div
                    key={lec.id}
                    className={cn('flex items-start gap-3 px-4 py-3', hasNext && 'border-b border-stone-200')}
                  >
                    <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', c.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900">{lec.title}</p>
                      <p className={cn('text-xs mt-0.5', c.text)}>
                        {lec.start_time ? `${lec.start_time} · ` : ''}{lec.lecturer_name || 'Лекция'}
                      </p>
                    </div>
                  </div>
                )
              })}
              {selectedTimetableEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    (i !== selectedTimetableEvents.length - 1 || selectedEvents.length > 0) && 'border-b border-stone-200'
                  )}
                >
                  <div className="mt-1 w-2 h-2 rounded-full bg-brand-accent/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{ev.title}</p>
                    <p className="text-xs text-brand-accent/80 mt-0.5">{ev.groupName}</p>
                  </div>
                </div>
              ))}
              {selectedEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    i !== selectedEvents.length - 1 && 'border-b border-stone-200'
                  )}
                >
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{ev.title}</p>
                    {ev.end_date && ev.end_date !== ev.date && (
                      <p className="text-xs text-blue-400/70 mt-0.5">
                        {new Date(ev.date    + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' → '}
                        {new Date(ev.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{ev.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      disabled={deleting === ev.id}
                      className="text-stone-400 hover:text-red-400 disabled:opacity-40 transition-colors shrink-0 mt-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <AddEventModal
          date={selected}
          onClose={closeModal}
          onSaved={ev => {
            const updated = [...events, ev].sort((a, b) => a.date.localeCompare(b.date))
            setEvents(updated)
            ssSet(SS_EVENTS + monthKey(year, month), JSON.stringify(updated))
          }}
        />
      )}
    </AppShell>
  )
}
