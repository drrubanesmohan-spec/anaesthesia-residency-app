import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { Search, ChevronDown, ChevronUp, AlertCircle, Star } from 'lucide-react'

interface Procedure { id: string; name: string; category: string; graduation_target: number; featured: boolean }

const LEVEL_LABELS = [
  '', // index 0 unused
  '1 — Я выполнил сам',
  '2 — Под прямым контролем',
  '3 — Под реактивным контролем',
  '4 — Наставник рядом',
  '5 — Самостоятельно',
]

function isoWeek(date: Date): string {
  const d = new Date(date)
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

export function LogbookAddPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()

  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [selected, setSelected] = useState<Procedure | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [count, setCount] = useState(1)
  const [complexity, setComplexity] = useState<'simple' | 'complex'>('simple')
  const [level, setLevel] = useState(1)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    pb.collection('procedures')
      .getFullList({ filter: "active = true", sort: 'category,sort,name' })
      .then(recs => {
        setProcedures(recs.filter(r => !r.field || r.field === 'anaesthesiology').map(r => ({
          id: r.id,
          name: r.name as string,
          category: r.category as string,
          graduation_target: (r.graduation_target as number) || 3,
          featured: !!r.featured,
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const featuredProcs = procedures.filter(p => p.featured)
  const filtered = procedures.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = filtered.reduce<Record<string, Procedure[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  async function save() {
    if (!selected || !appUser) return
    setSaving(true)
    setError('')
    try {
      await pb.collection('logbook_entries').create({
        resident: appUser.id,
        procedure: selected.id,
        date,
        count,
        complexity,
        resident_level: level,
        comment,
        status: 'draft',
        iso_week: isoWeek(new Date(date)),
      })
      navigate('/resident/logbook')
    } catch (e) {
      setError((e as Error).message || 'Ошибка сохранения')
      setSaving(false)
    }
  }

  if (loading) return (
    <AppShell title="Добавить запись" showBack>
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Добавить запись" showBack>
      <div className="space-y-4">

        {/* Procedure picker */}
        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск манипуляции…"
                className="w-full rounded-xl bg-stone-100 pl-9 pr-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>

            {/* Featured section — pinned at top, hidden when searching */}
            {!search && featuredProcs.length > 0 && (
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="flex w-full items-center justify-between px-4 py-2.5 bg-amber-50">
                  <div className="flex items-center gap-2">
                    <Star size={13} className="text-amber-500 fill-amber-500" />
                    <span className="text-xs font-semibold text-amber-800">Часто используемые</span>
                  </div>
                  <span className="text-xs text-amber-500">{featuredProcs.length}</span>
                </div>
                <div className="divide-y divide-amber-100">
                  {featuredProcs.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-amber-50/60 transition-colors"
                    >
                      <span className="text-sm text-stone-800">{p.name}</span>
                      <span className="text-xs text-stone-400 shrink-0 ml-2">цель: {p.graduation_target}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, procs]) => {
              const open = expanded[cat] ?? search.length > 0
              return (
                <div key={cat} className="rounded-xl border border-stone-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [cat]: !open }))}
                    className="flex w-full items-center justify-between px-4 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
                  >
                    <span className="text-xs font-semibold text-stone-700">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">{procs.length}</span>
                      {open ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
                    </div>
                  </button>
                  {open && (
                    <div className="divide-y divide-stone-100">
                      {procs.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-brand-accent/5 transition-colors"
                        >
                          <span className="text-sm text-stone-800">{p.name}</span>
                          <span className="text-xs text-stone-400 shrink-0 ml-2">цель: {p.graduation_target}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected procedure */}
            <div className="flex items-start justify-between rounded-xl border border-brand-accent/30 bg-brand-accent/5 px-4 py-3">
              <div>
                <p className="text-xs text-stone-400 mb-0.5">{selected.category}</p>
                <p className="text-sm font-semibold text-stone-900">{selected.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-stone-400 hover:text-stone-600 shrink-0 ml-3 mt-0.5">Изменить</button>
            </div>

            {/* Date */}
            <div className="rounded-xl bg-stone-100 px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-stone-400 shrink-0">Дата</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              />
            </div>

            {/* Count */}
            <div className="rounded-xl bg-stone-100 px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-stone-400 shrink-0">Кол-во</span>
              <input
                type="number"
                min={1}
                value={count}
                onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              />
            </div>

            {/* Complexity */}
            <div className="flex gap-2">
              {(['simple', 'complex'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setComplexity(c)}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
                    complexity === c ? 'bg-brand-accent text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  )}
                >
                  {c === 'simple' ? 'Простая' : 'Сложная'}
                </button>
              ))}
            </div>

            {/* Level */}
            <div className="space-y-2">
              <p className="text-xs text-stone-400 px-1">Предлагаемый уровень</p>
              {[1, 2, 3, 4, 5].map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    'w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors',
                    level === l ? 'bg-brand-accent text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>

            {/* Comment */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <AlertCircle size={12} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600">Не указывайте данные пациента — имена, ДР, номера карт</p>
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Заметка (необязательно)"
                rows={2}
                className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={save}
              disabled={saving || !date}
              className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Сохранение…' : 'Сохранить черновик'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
