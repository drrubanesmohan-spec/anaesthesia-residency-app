import { useEffect, useState, useCallback } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Entry {
  id: string
  resident_id: string
  resident_name: string
  procedure_name: string
  date: string
  count: number
  complexity: 'simple' | 'complex'
  resident_level: number
  comment: string
  iso_week: string
}

const LEVEL_LABELS = [
  '',
  '1 — Сам',
  '2 — Прямой контроль',
  '3 — Реактивный контроль',
  '4 — Рядом',
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

interface ReviewModalProps {
  entry: Entry
  onDone: () => void
  onClose: () => void
}

function ReviewModal({ entry, onDone, onClose }: ReviewModalProps) {
  const [supLevel, setSupLevel] = useState(entry.resident_level)
  const [remark, setRemark] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!action) return
    if (action === 'reject' && !remark.trim()) {
      setError('Замечание обязательно при отклонении')
      return
    }
    setSaving(true)
    setError('')
    try {
      await pb.collection('logbook_entries').update(entry.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        supervisor_level: action === 'approve' ? supLevel : null,
        remark: remark.trim(),
      })
      onDone()
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">Проверка записи</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="rounded-xl bg-stone-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-stone-900">{entry.procedure_name}</p>
          <p className="text-xs text-stone-500">
            {entry.resident_name} · {new Date(entry.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            {' · '}{entry.count} шт. · {entry.complexity === 'simple' ? 'Простая' : 'Сложная'}
          </p>
          <p className="text-xs text-stone-500">Предложен уровень: <strong>{LEVEL_LABELS[entry.resident_level]}</strong></p>
          {entry.comment && <p className="text-xs text-stone-400 italic mt-1">{entry.comment}</p>}
        </div>

        {/* Approve / reject toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setAction('approve')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border-2 transition-colors',
              action === 'approve' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 text-stone-500 hover:border-emerald-300')}
          >
            <Check size={14} /> Принять
          </button>
          <button
            onClick={() => setAction('reject')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border-2 transition-colors',
              action === 'reject' ? 'bg-red-500 border-red-500 text-white' : 'border-stone-200 text-stone-500 hover:border-red-300')}
          >
            <X size={14} /> Отклонить
          </button>
        </div>

        {action === 'approve' && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 px-1">Подтверждённый уровень</p>
            {[1, 2, 3, 4, 5].map(l => (
              <button
                key={l}
                onClick={() => setSupLevel(l)}
                className={cn(
                  'w-full rounded-xl px-4 py-2 text-left text-sm transition-colors',
                  supLevel === l ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                )}
              >
                {LEVEL_LABELS[l]}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-stone-400 px-1">
            Замечание{action === 'reject' ? ' (обязательно)' : ' (необязательно)'}
          </p>
          <textarea
            value={remark}
            onChange={e => setRemark(e.target.value)}
            rows={3}
            placeholder="Комментарий для ординатора"
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <button
          onClick={submit}
          disabled={saving || !action}
          className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Сохранение…' : 'Подтвердить'}
        </button>
      </div>
    </div>
  )
}

export function LogbookReviewPage() {
  const { appUser } = useAuth()

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => isoWeekFromDate(new Date()))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [reviewing, setReviewing] = useState<Entry | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true)
    try {
      const recs = await pb.collection('logbook_entries').getFullList({
        filter: `supervisor = '${appUser.id}' && status = 'submitted'`,
        sort: '-date',
        expand: 'resident,procedure',
      })
      setEntries(recs.map(r => {
        const expR = (r.expand as Record<string, Record<string, unknown>>)?.resident
        const expP = (r.expand as Record<string, Record<string, unknown>>)?.procedure
        return {
          id: r.id,
          resident_id: r.resident as string,
          resident_name: (expR?.full_name as string) || '—',
          procedure_name: (expP?.name as string) || '—',
          date: r.date as string,
          count: r.count as number,
          complexity: r.complexity as 'simple' | 'complex',
          resident_level: r.resident_level as number,
          comment: (r.comment as string) || '',
          iso_week: (r.iso_week as string) || '',
        }
      }))
    } catch { /* ignore */ }
    setLoading(false)
  }, [appUser])

  useEffect(() => { load() }, [load])

  const weekEntries = entries.filter(e => e.iso_week === currentWeek)

  // Group by resident
  const byResident = weekEntries.reduce<Record<string, { name: string; entries: Entry[] }>>((acc, e) => {
    if (!acc[e.resident_id]) acc[e.resident_id] = { name: e.resident_name, entries: [] }
    acc[e.resident_id].entries.push(e)
    return acc
  }, {})

  async function bulkApprove() {
    setBulkSaving(true)
    const matching = weekEntries.filter(() => true) // all submitted in week
    for (const e of matching) {
      try {
        await pb.collection('logbook_entries').update(e.id, {
          status: 'approved',
          supervisor_level: e.resident_level,
          remark: '',
        })
      } catch { /* skip */ }
    }
    await load()
    setBulkSaving(false)
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

  if (loading) return (
    <AppShell title="Проверка логбука">
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title={`Проверка${entries.length > 0 ? ` (${entries.length})` : ''}`}>
      <div className="space-y-4">

        {/* Week nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="p-1 text-stone-400 hover:text-stone-700"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="text-xs font-semibold text-stone-700">{currentWeek} · {weekLabel(currentWeek)}</p>
            <p className="text-xs text-stone-400">{weekEntries.length} записей</p>
          </div>
          <button onClick={nextWeek} className="p-1 text-stone-400 hover:text-stone-700"><ChevronRight size={18} /></button>
        </div>

        {/* Bulk approve */}
        {weekEntries.length > 0 && (
          <button
            onClick={bulkApprove}
            disabled={bulkSaving}
            className="flex items-center gap-2 w-full justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
          >
            <Check size={14} />
            {bulkSaving ? 'Принятие…' : `Принять все (${weekEntries.length}) с предложенным уровнем`}
          </button>
        )}

        {Object.keys(byResident).length === 0 ? (
          <p className="text-center text-sm text-stone-400 py-8 italic">Нет записей на проверке за эту неделю</p>
        ) : (
          Object.entries(byResident).map(([resId, { name, entries: resEntries }]) => {
            const open = expanded[resId] ?? true
            return (
              <div key={resId} className="rounded-xl border border-stone-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(p => ({ ...p, [resId]: !open }))}
                  className="flex w-full items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <span className="text-sm font-semibold text-stone-800">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{resEntries.length}</span>
                    {open ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
                  </div>
                </button>
                {open && (
                  <div className="divide-y divide-stone-100">
                    {resEntries.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => setReviewing(entry)}
                        className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 leading-tight truncate">{entry.procedure_name}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            {' · '}{entry.count} шт. · Ур.{entry.resident_level}
                          </p>
                        </div>
                        <span className="text-xs text-brand-accent shrink-0 ml-2 mt-0.5">Проверить</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        {entries.length === 0 && (
          <p className="text-center text-sm text-stone-400 py-4 italic">Все проверено!</p>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          entry={reviewing}
          onDone={() => { setReviewing(null); load() }}
          onClose={() => setReviewing(null)}
        />
      )}
    </AppShell>
  )
}
