import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
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

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    onSaved(data as CalendarEvent)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1e293b] p-5 pb-10 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400">{label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-base font-semibold text-white mb-4">New Event</p>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            placeholder="Notes (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
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

export function CalendarPage() {
  const { appUser } = useAuth()
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'supervisor'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadMonth = useCallback(async () => {
    setLoading(true)
    const firstDay = isoDate(year, month, 1)
    const lastDay = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, date, description, created_by')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date')
    setEvents((data ?? []) as CalendarEvent[])
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  // Days that have events this month
  const eventDates = new Set(events.map(e => e.date))

  // Events for selected day
  const selectedEvents = events.filter(e => e.date === selected)

  async function deleteEvent(id: string) {
    setDeleting(id)
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
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
  const selectedLabel = new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <AppShell title="Calendar">
      <div className="flex flex-col gap-4">

        {/* Month grid */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-white">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-700/50 transition-colors text-slate-300">
              <ChevronRight size={18} />
            </button>
          </div>

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

              const dateStr = isoDate(year, month, dayNum)
              const isToday = dateStr === today
              const isSelected = dateStr === selected
              const hasEvent = eventDates.has(dateStr)

              return (
                <div key={idx} className="flex flex-col items-center py-0.5">
                  <button
                    onClick={() => setSelected(dateStr)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : isToday
                        ? 'ring-1 ring-blue-400 text-blue-300'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    )}
                  >
                    {dayNum}
                  </button>
                  <div className="h-1.5 flex items-center justify-center mt-0.5">
                    {hasEvent && (
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-white' : 'bg-blue-400'
                      )} />
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
                onClick={() => setShowModal(true)}
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
          onClose={() => setShowModal(false)}
          onSaved={ev => setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)))}
        />
      )}
    </AppShell>
  )
}
