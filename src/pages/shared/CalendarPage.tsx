import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, ChevronDown } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface CalendarEvent {
  id: string
  title: string
  date: string
  description: string | null
  created_by: string | null
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const SS_YEAR     = 'cal_year'
const SS_MONTH    = 'cal_month'
const SS_SELECTED = 'cal_selected'
const SS_EVENTS   = 'cal_events_'   // + "YYYY-MM" key
const SS_DRAFT_T  = 'cal_draft_title'
const SS_DRAFT_D  = 'cal_draft_desc'
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

/* ─── Add event modal — persists draft across window switches ─────── */

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
  const [title, setTitle]       = useState(() => ss(SS_DRAFT_T) ?? '')
  const [description, setDesc]  = useState(() => ss(SS_DRAFT_D) ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Persist draft on every keystroke
  function handleTitle(v: string)  { setTitle(v);  ssSet(SS_DRAFT_T, v) }
  function handleDesc(v: string)   { setDesc(v);   ssSet(SS_DRAFT_D, v) }

  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('calendar_events')
      .insert({ title: title.trim(), date, description: description.trim() || null, created_by: appUser?.id })
      .select()
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    // Clear persisted draft on success
    ssRemove(SS_DRAFT_T); ssRemove(SS_DRAFT_D); ssRemove(SS_MODAL)
    onSaved(data as CalendarEvent)
    onClose()
  }

  function handleClose() {
    ssRemove(SS_MODAL)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1e293b] p-5 pb-10 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400">{label}</span>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-base font-semibold text-white mb-4">New Event</p>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Title"
            value={title}
            onChange={e => handleTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            placeholder="Notes (optional)"
            value={description}
            onChange={e => handleDesc(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Calendar page ──────────────────────────────────────────────── */

export function CalendarPage() {
  const { appUser } = useAuth()
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'supervisor'

  const now = new Date()

  // Restore from sessionStorage on mount
  const [year,     setYearRaw]     = useState<number>(() => parseInt(ss(SS_YEAR)  ?? String(now.getFullYear())))
  const [month,    setMonthRaw]    = useState<number>(() => parseInt(ss(SS_MONTH) ?? String(now.getMonth())))
  const [selected, setSelectedRaw] = useState<string>(() => ss(SS_SELECTED) ?? todayStr())
  const [events,   setEvents]      = useState<CalendarEvent[]>(() => {
    const cached = ss(SS_EVENTS + monthKey(
      parseInt(ss(SS_YEAR) ?? String(now.getFullYear())),
      parseInt(ss(SS_MONTH) ?? String(now.getMonth()))
    ))
    return cached ? (JSON.parse(cached) as CalendarEvent[]) : []
  })
  const [loading,    setLoading]   = useState(events.length === 0)
  const [showModal,  setShowModal]  = useState(() => ss(SS_MODAL) === '1')
  const [showPicker, setShowPicker] = useState(false)
  const [pickYear,   setPickYear]   = useState(year)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  // Persist state helpers
  function setYear(y: number)     { setYearRaw(y);  ssSet(SS_YEAR, String(y)) }
  function setMonth(m: number)    { setMonthRaw(m); ssSet(SS_MONTH, String(m)) }
  function setSelected(d: string) { setSelectedRaw(d); ssSet(SS_SELECTED, d) }

  function openModal()  { ssSet(SS_MODAL, '1'); setShowModal(true) }
  function closeModal() { ssRemove(SS_MODAL);   setShowModal(false) }

  // Load events for current month (background-refresh even if cached)
  const isFetching = useRef(false)
  const loadMonth = useCallback(async () => {
    if (isFetching.current) return
    isFetching.current = true
    const firstDay = isoDate(year, month, 1)
    const lastDay  = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, date, description, created_by')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date')
    const fresh = (data ?? []) as CalendarEvent[]
    setEvents(fresh)
    ssSet(SS_EVENTS + monthKey(year, month), JSON.stringify(fresh))
    setLoading(false)
    isFetching.current = false
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  // Refresh events when returning to the tab/window
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') loadMonth()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadMonth])

  const eventDates    = new Set(events.map(e => e.date))
  const selectedEvents = events.filter(e => e.date === selected)

  async function deleteEvent(id: string) {
    setDeleting(id)
    await supabase.from('calendar_events').delete().eq('id', id)
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

        {/* Month grid */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Month/year label — tapping opens picker */}
            <button
              onClick={() => { setPickYear(year); setShowPicker(v => !v) }}
              className="flex items-center gap-1 text-sm font-semibold text-white hover:text-blue-300 transition-colors"
            >
              {monthLabel}
              <ChevronDown size={14} className={cn('transition-transform', showPicker && 'rotate-180')} />
            </button>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Month/year picker dropdown */}
          {showPicker && (
            <div className="border-b border-slate-700/50 px-3 pt-3 pb-4 bg-slate-800/60">
              {/* Year row */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPickYear(y => y - 1)}
                  className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-white">{pickYear}</span>
                <button
                  onClick={() => setPickYear(y => y + 1)}
                  className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {/* Month grid 3×4 */}
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
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* DOW row */}
          <div className="grid grid-cols-7 px-2 pt-3">
            {DOW.map((d, i) => (
              <div key={i} className="flex justify-center">
                <span className="text-[10px] font-medium text-slate-500 w-8 text-center">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
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
              const hasEvent  = eventDates.has(dateStr)
              return (
                <div key={idx} className="flex flex-col items-center py-0.5">
                  <button
                    onClick={() => setSelected(dateStr)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isSel   ? 'bg-blue-500 text-white'
                      : isToday ? 'ring-1 ring-blue-400 text-blue-300'
                      : 'text-slate-300 hover:bg-slate-700/50'
                    )}
                  >
                    {dayNum}
                  </button>
                  <div className="h-1.5 flex items-center justify-center mt-0.5">
                    {hasEvent && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSel ? 'bg-white' : 'bg-blue-400')} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-xs font-semibold text-slate-300">{selectedLabel}</span>
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

          {selectedEvents.length === 0 ? (
            <p className="px-4 py-4 text-xs text-slate-600 italic">No events on this day.</p>
          ) : (
            <div>
              {selectedEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    i !== selectedEvents.length - 1 && 'border-b border-slate-700/40'
                  )}
                >
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{ev.title}</p>
                    {ev.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      disabled={deleting === ev.id}
                      className="text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors shrink-0 mt-0.5"
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
