import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Send, X, Star, Search, ChevronDown, ChevronUp, Pencil } from 'lucide-react'

interface Entry {
  id: string
  procedure_name: string
  procedure_id: string
  date: string
  count: number
  complexity: 'simple' | 'complex'
  resident_level: number
  comment: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  supervisor_level: number | null
  remark: string
  iso_week: string
}

interface Procedure {
  id: string
  name: string
  category: string
  graduation_target: number
  featured: boolean
}

type Tab = 'week' | 'totals'

const STATUS_INFO: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:     { label: 'Черновик',    cls: 'bg-stone-100 text-stone-500',   icon: <Clock size={10} /> },
  submitted: { label: 'На проверке', cls: 'bg-sky-100 text-sky-600',       icon: <Clock size={10} /> },
  approved:  { label: 'Принято',     cls: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={10} /> },
  rejected:  { label: 'Отклонено',   cls: 'bg-red-100 text-red-500',       icon: <XCircle size={10} /> },
}

const LEVEL_LABELS = [
  '',
  '1 — Я выполнил сам',
  '2 — Под прямым контролем',
  '3 — Под реактивным контролем',
  '4 — Наставник рядом',
  '5 — Самостоятельно',
]

function isoWeekFromDate(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  let week = Math.ceil((dayOfYear + (jan4.getDay() || 7)) / 7)
  let yr = d.getFullYear()
  if (week > 52) {
    const dec28 = new Date(yr, 11, 28)
    if (d > dec28) { yr++; week = 1 }
  }
  return `${yr}-W${String(week).padStart(2, '0')}`
}

function weekLabel(isoWeek: string): string {
  const [yr, w] = isoWeek.split('-W')
  const jan4 = new Date(Number(yr), 0, 4)
  const dow = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - dow + 1 + (Number(w) - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Quick-add bottom sheet ────────────────────────────────────────────────────
interface PickerProps {
  proc: Procedure
  onSave: (count: number, complexity: 'simple' | 'complex', level: number) => Promise<void>
  onClose: () => void
}

function ProcPicker({ proc, onSave, onClose }: PickerProps) {
  const [count, setCount] = useState(1)
  const [complexity, setComplexity] = useState<'simple' | 'complex'>('simple')
  const [level, setLevel] = useState(3)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    await onSave(count, complexity, level)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white px-4 pt-4 pb-10 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900 flex-1 pr-3 leading-tight">{proc.name}</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 shrink-0"><X size={16} /></button>
        </div>

        {/* Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 w-16">Кол-во</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(c => Math.max(1, c - 1))}
              className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 text-lg font-semibold flex items-center justify-center hover:bg-stone-200"
            >−</button>
            <span className="text-lg font-semibold text-stone-900 w-6 text-center">{count}</span>
            <button
              onClick={() => setCount(c => c + 1)}
              className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 text-lg font-semibold flex items-center justify-center hover:bg-stone-200"
            >+</button>
          </div>
        </div>

        {/* Complexity */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 w-16">Тип</span>
          <div className="flex gap-2 flex-1">
            {(['simple', 'complex'] as const).map(c => (
              <button
                key={c}
                onClick={() => setComplexity(c)}
                className={cn(
                  'flex-1 rounded-xl py-2 text-xs font-semibold transition-colors',
                  complexity === c ? 'bg-brand-accent text-white' : 'bg-stone-100 text-stone-500'
                )}
              >
                {c === 'simple' ? 'Простая' : 'Сложная'}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="space-y-1.5">
          <span className="text-xs text-stone-400">Уровень</span>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-xs transition-colors',
                  level === l ? 'bg-brand-accent text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                )}
              >
                {LEVEL_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Сохранение…' : 'В черновик'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function LogbookPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('week')
  const [entries, setEntries] = useState<Entry[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => isoWeekFromDate(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [picking, setPicking] = useState<Procedure | null>(null)
  const [search, setSearch] = useState('')
  const [catExpanded, setCatExpanded] = useState<Record<string, boolean>>({})

  const loadEntries = useCallback(async () => {
    if (!appUser) return
    const recs = await pb.collection('logbook_entries').getFullList({
      filter: `resident = '${appUser.id}'`,
      sort: '-date',
      expand: 'procedure',
    }).catch(() => [])
    setEntries(recs.map(r => {
      const proc = (r.expand as Record<string, Record<string, unknown>>)?.procedure
      return {
        id: r.id,
        procedure_name: (proc?.name as string) || '—',
        procedure_id: r.procedure as string,
        date: r.date as string,
        count: r.count as number,
        complexity: r.complexity as 'simple' | 'complex',
        resident_level: r.resident_level as number,
        comment: (r.comment as string) || '',
        status: r.status as Entry['status'],
        supervisor_level: (r.supervisor_level as number) || null,
        remark: (r.remark as string) || '',
        iso_week: (r.iso_week as string) || '',
      }
    }))
  }, [appUser])

  useEffect(() => {
    if (!appUser) return
    Promise.all([
      loadEntries(),
      pb.collection('procedures').getFullList({ filter: "active = true", sort: 'category,sort,name' })
        .then(recs => setProcedures(recs.filter(r => !r.field || r.field === 'anaesthesiology').map(r => ({
          id: r.id,
          name: r.name as string,
          category: r.category as string,
          graduation_target: (r.graduation_target as number) || 3,
          featured: !!r.featured,
        }))))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [appUser, loadEntries])

  const todayStr = new Date().toISOString().slice(0, 10)
  const weekEntries = entries.filter(e => e.iso_week === currentWeek)
  const todayDrafts = weekEntries.filter(e => e.date === todayStr && e.status === 'draft')
  const draftCount = weekEntries.filter(e => e.status === 'draft').length

  // Non-today entries + today non-drafts for the week, grouped by date
  const otherEntries = weekEntries.filter(e => !(e.date === todayStr && e.status === 'draft'))
  const byDate = otherEntries.reduce<Record<string, Entry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  async function addEntry(proc: Procedure, count: number, complexity: 'simple' | 'complex', level: number) {
    if (!appUser) return
    await pb.collection('logbook_entries').create({
      procedure: proc.id,
      date: todayStr,
      count,
      complexity,
      resident_level: level,
      status: 'draft',
      iso_week: isoWeekFromDate(new Date()),
    })
    await loadEntries()
    setPicking(null)
  }

  async function deleteEntry(id: string) {
    await pb.collection('logbook_entries').delete(id).catch(() => {})
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function submitWeek() {
    const drafts = weekEntries.filter(e => e.status === 'draft')
    if (!drafts.length) return
    setSubmitting(true)
    for (const e of drafts) {
      await pb.collection('logbook_entries').update(e.id, { status: 'submitted' }).catch(() => {})
    }
    await loadEntries()
    setSubmitting(false)
  }

  function prevWeek() {
    const [yr, w] = currentWeek.split('-W')
    const d = new Date(Number(yr), 0, 4)
    d.setDate(d.getDate() - (d.getDay() || 7) + 1 + (Number(w) - 1) * 7 - 7)
    setCurrentWeek(isoWeekFromDate(d))
  }
  function nextWeek() {
    const [yr, w] = currentWeek.split('-W')
    const d = new Date(Number(yr), 0, 4)
    d.setDate(d.getDate() - (d.getDay() || 7) + 1 + (Number(w) - 1) * 7 + 7)
    setCurrentWeek(isoWeekFromDate(d))
  }

  const featuredProcs = procedures.filter(p => p.featured)
  const filteredProcs = procedures.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  )
  const byCategory = filteredProcs.reduce<Record<string, Procedure[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  // Totals
  const totals = entries
    .filter(e => e.status === 'approved')
    .reduce<Record<string, { name: string; count: number }>>((acc, e) => {
      if (!acc[e.procedure_id]) acc[e.procedure_id] = { name: e.procedure_name, count: 0 }
      acc[e.procedure_id].count += e.count
      return acc
    }, {})

  if (loading) return (
    <AppShell title="Логбук">
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Логбук">
      <div className="space-y-3">

        {/* Tabs */}
        <div className="flex rounded-xl bg-stone-100 p-1 gap-1 max-w-sm">
          {(['week', 'totals'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                tab === t ? 'bg-white text-stone-900 shadow' : 'text-stone-500'
              )}
            >
              {t === 'week' ? 'Моя неделя' : 'Итоги'}
            </button>
          ))}
        </div>

        {/* ── WEEK TAB ── */}
        {tab === 'week' && (
          <div className="space-y-3">

            {/* Week nav */}
            <div className="flex items-center justify-between max-w-sm">
              <button onClick={prevWeek} className="p-1 text-stone-400 hover:text-stone-700"><ChevronLeft size={16} /></button>
              <div className="text-center">
                <p className="text-xs font-semibold text-stone-700">{weekLabel(currentWeek)}</p>
                <p className="text-[10px] text-stone-400">{weekEntries.length} записей</p>
              </div>
              <button onClick={nextWeek} className="p-1 text-stone-400 hover:text-stone-700"><ChevronRight size={16} /></button>
            </div>

            {/* Two-column layout: diary left, procedure picker right */}
            <div className="grid grid-cols-2 gap-3 items-start">

              {/* ── Left: diary ── */}
              <div className="space-y-2">

                {/* Today's draft block */}
                {todayDrafts.length > 0 && (
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-700">
                        Черновик · {new Date(todayStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                      <span className="text-[10px] text-stone-400">{todayDrafts.length} манип.</span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {todayDrafts.map(e => (
                        <div key={e.id} className="flex items-center gap-2 px-3 py-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-stone-900 truncate">{e.procedure_name}</p>
                            <p className="text-[10px] text-stone-400">×{e.count} · Ур.{e.resident_level} · {e.complexity === 'simple' ? 'Пр.' : 'Сл.'}</p>
                          </div>
                          <button
                            onClick={() => navigate(`/resident/logbook/edit/${e.id}`)}
                            className="text-stone-300 hover:text-stone-600 p-1"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="text-stone-300 hover:text-red-400 p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {draftCount > 0 && (
                      <button
                        onClick={submitWeek}
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-stone-100 py-2 text-xs font-semibold text-brand-accent hover:bg-brand-accent/5 disabled:opacity-40 transition-colors"
                      >
                        <Send size={11} />
                        {submitting ? 'Отправка…' : `Отправить (${draftCount})`}
                      </button>
                    )}
                  </div>
                )}

                {/* Other week entries grouped by date */}
                {Object.keys(byDate).sort((a, b) => b.localeCompare(a)).length > 0 && (
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    {Object.entries(byDate)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([date, dateEntries], di) => (
                        <div key={date} className={cn(di > 0 && 'border-t border-stone-100')}>
                          <p className="px-3 py-1.5 text-[10px] font-semibold text-stone-400 bg-stone-50 uppercase tracking-wide">
                            {dayLabel(date)}
                          </p>
                          <div className="divide-y divide-stone-100">
                            {dateEntries.map(e => {
                              const si = STATUS_INFO[e.status]
                              return (
                                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-stone-900 truncate">{e.procedure_name}</p>
                                    {e.remark && <p className="text-[10px] text-red-400 truncate">↩ {e.remark}</p>}
                                  </div>
                                  <span className="text-[10px] text-stone-400 shrink-0">×{e.count} Ур.{e.resident_level}</span>
                                  <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0', si.cls)}>
                                    {si.icon}{si.label}
                                  </span>
                                  {e.status === 'rejected' && (
                                    <button onClick={() => navigate(`/resident/logbook/edit/${e.id}`)} className="text-stone-300 hover:text-stone-600">
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {weekEntries.length === 0 && todayDrafts.length === 0 && (
                  <p className="text-xs text-stone-400 py-4 italic">Нет записей за эту неделю</p>
                )}
              </div>

              {/* ── Right: procedure picker ── */}
              <div className="space-y-2 sticky top-4">
                <p className="text-xs font-semibold text-stone-500 px-0.5">Добавить манипуляцию</p>

                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск…"
                    className="w-full rounded-xl bg-stone-100 pl-8 pr-3 py-2 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                  />
                </div>

                <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-0.5">
                  {/* Featured */}
                  {!search && featuredProcs.length > 0 && (
                    <div className="rounded-xl border border-amber-200 overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border-b border-amber-100">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-amber-800">Часто используемые</span>
                      </div>
                      <div className="divide-y divide-amber-100">
                        {featuredProcs.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setPicking(p)}
                            className="w-full text-left px-3 py-2 text-xs text-stone-800 hover:bg-amber-50/60 transition-colors"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category groups */}
                  {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, procs]) => {
                    const open = catExpanded[cat] ?? (search.length > 0)
                    return (
                      <div key={cat} className="rounded-xl border border-stone-200 overflow-hidden">
                        <button
                          onClick={() => setCatExpanded(p => ({ ...p, [cat]: !open }))}
                          className="flex w-full items-center justify-between px-3 py-2 bg-stone-50 hover:bg-stone-100 transition-colors"
                        >
                          <span className="text-xs font-semibold text-stone-600">{cat}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-400">{procs.length}</span>
                            {open ? <ChevronUp size={12} className="text-stone-400" /> : <ChevronDown size={12} className="text-stone-400" />}
                          </div>
                        </button>
                        {open && (
                          <div className="divide-y divide-stone-100">
                            {procs.map(p => (
                              <button
                                key={p.id}
                                onClick={() => setPicking(p)}
                                className="w-full text-left px-3 py-2 text-xs text-stone-800 hover:bg-brand-accent/5 transition-colors flex items-center justify-between"
                              >
                                <span>{p.name}</span>
                                <span className="text-[10px] text-stone-400 shrink-0 ml-2">/{p.graduation_target}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── TOTALS TAB ── */}
        {tab === 'totals' && (
          <div className="max-w-sm space-y-2">
            <p className="text-xs text-stone-400 px-0.5">Только принятые записи</p>
            {Object.keys(totals).length === 0 ? (
              <p className="text-center text-xs text-stone-400 py-8 italic">Нет принятых записей</p>
            ) : (
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {Object.values(totals)
                    .sort((a, b) => b.count - a.count)
                    .map(({ name, count }) => (
                      <div key={name} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 text-xs text-stone-800">{name}</span>
                        <span className="text-xs font-semibold text-stone-900">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Procedure picker bottom sheet */}
      {picking && (
        <ProcPicker
          proc={picking}
          onSave={(count, complexity, level) => addEntry(picking, count, complexity, level)}
          onClose={() => setPicking(null)}
        />
      )}
    </AppShell>
  )
}
