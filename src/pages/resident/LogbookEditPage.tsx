import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import { AlertCircle } from 'lucide-react'

const LEVEL_LABELS = [
  '',
  '1 — Я выполнил сам',
  '2 — Под прямым контролем',
  '3 — Под реактивным контролем',
  '4 — Наставник рядом',
  '5 — Самостоятельно',
]

export function LogbookEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [procedureName, setProcedureName] = useState('')
  const [date, setDate] = useState('')
  const [count, setCount] = useState(1)
  const [complexity, setComplexity] = useState<'simple' | 'complex'>('simple')
  const [level, setLevel] = useState(1)
  const [comment, setComment] = useState('')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    pb.collection('logbook_entries').getOne(id, { expand: 'procedure' }).then(rec => {
      const proc = (rec.expand as Record<string, Record<string, unknown>>)?.procedure
      setProcedureName((proc?.name as string) || '—')
      setDate(rec.date as string)
      setCount(rec.count as number)
      setComplexity(rec.complexity as 'simple' | 'complex')
      setLevel(rec.resident_level as number)
      setComment((rec.comment as string) || '')
      setRemark((rec.remark as string) || '')
      setLoading(false)
    }).catch(() => navigate('/resident/logbook'))
  }, [id, navigate])

  async function save() {
    if (!id) return
    setSaving(true)
    setError('')
    try {
      await pb.collection('logbook_entries').update(id, {
        date,
        count,
        complexity,
        resident_level: level,
        comment,
        status: 'draft',
      })
      navigate('/resident/logbook')
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  async function resubmit() {
    if (!id) return
    setSaving(true)
    setError('')
    try {
      await pb.collection('logbook_entries').update(id, {
        date, count, complexity, resident_level: level, comment, status: 'submitted',
      })
      navigate('/resident/logbook')
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  if (loading) return (
    <AppShell title="Редактировать" showBack>
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Редактировать" showBack>
      <div className="space-y-4">

        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-xs text-stone-400">Манипуляция</p>
          <p className="text-sm font-semibold text-stone-900 mt-0.5">{procedureName}</p>
        </div>

        {remark && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-500 font-semibold mb-0.5">Замечание руководителя</p>
            <p className="text-sm text-red-700">{remark}</p>
          </div>
        )}

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

        {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-stone-200 py-3 text-sm font-semibold text-stone-700 disabled:opacity-40"
          >
            Сохранить
          </button>
          <button
            onClick={resubmit}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Отправить
          </button>
        </div>
      </div>
    </AppShell>
  )
}
