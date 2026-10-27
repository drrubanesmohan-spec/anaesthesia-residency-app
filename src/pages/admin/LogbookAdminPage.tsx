import { useEffect, useState, useCallback } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import { Plus, Pencil, Trash2, AlertCircle, Download, X, Star } from 'lucide-react'

interface Procedure {
  id: string; name: string; category: string; field: string
  sort: number; active: boolean; graduation_target: number | null
  featured: boolean
}
interface OverdueEntry {
  id: string; resident_name: string; procedure_name: string
  date: string; submitted_at: string; days: number
}
interface AuditRow {
  id: string; entry_id: string; actor_name: string
  action: string; at: string; before: string; after: string
}
interface ApprovedEntry {
  id: string; resident_name: string; procedure_name: string; category: string
  date: string; count: number; complexity: string
  resident_level: number; supervisor_level: number | null
  supervisor_name: string; reviewed_at: string
}

type Tab = 'procedures' | 'overdue' | 'audit' | 'export'

interface ProcModalProps {
  proc?: Procedure
  field?: string
  onSave: () => void
  onClose: () => void
}

function ProcModal({ proc, field = 'anaesthesiology', onSave, onClose }: ProcModalProps) {
  const isEdit = !!proc
  const [name, setName] = useState(proc?.name ?? '')
  const [category, setCategory] = useState(proc?.category ?? '')
  const [target, setTarget] = useState(String(proc?.graduation_target ?? ''))
  const [active, setActive] = useState(proc?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim() || !category.trim()) return
    setSaving(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        category: category.trim(),
        field,
        active,
        graduation_target: target ? parseInt(target) : null,
      }
      if (isEdit) {
        await pb.collection('procedures').update(proc!.id, data)
      } else {
        await pb.collection('procedures').create({ ...data, sort: 999 })
      }
      onSave()
      onClose()
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  async function retire() {
    if (!proc) return
    setSaving(true)
    try {
      await pb.collection('procedures').update(proc.id, { active: false })
      onSave()
      onClose()
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  async function del() {
    if (!proc) return
    setSaving(true)
    try {
      await pb.collection('procedures').delete(proc.id)
      onSave()
      onClose()
    } catch (e) {
      setError((e as Error).message || 'Ошибка')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать' : 'Новая манипуляция'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="Название"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <input
          value={category} onChange={e => setCategory(e.target.value)}
          placeholder="Категория / раздел"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <div className="flex items-center gap-3 rounded-xl bg-stone-100 px-4 py-2.5">
          <span className="text-xs text-stone-400 shrink-0">Цель (1–5)</span>
          <input
            type="number" min={1} max={5}
            value={target} onChange={e => setTarget(e.target.value)}
            placeholder="—"
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
          />
        </div>
        <label className="flex items-center gap-3 px-1">
          <input
            type="checkbox" checked={active}
            onChange={e => setActive(e.target.checked)}
            className="accent-brand-accent w-4 h-4"
          />
          <span className="text-sm text-stone-700">Активна (отображается при добавлении)</span>
        </label>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <div className="flex gap-2">
          {isEdit && (
            <>
              {proc!.active && (
                <button onClick={retire} disabled={saving}
                  className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-100 disabled:opacity-40">
                  Убрать
                </button>
              )}
              <button onClick={del} disabled={saving}
                className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100 disabled:opacity-40">
                <Trash2 size={15} />
              </button>
            </>
          )}
          <button onClick={save} disabled={saving || !name.trim() || !category.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}


export function LogbookAdminPage() {
  const [tab, setTab] = useState<Tab>('procedures')
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [overdue, setOverdue] = useState<OverdueEntry[]>([])
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [approved, setApproved] = useState<ApprovedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [procs554, setProcs554] = useState<Procedure[]>([])
  const [editProc, setEditProc] = useState<Procedure | 'new' | undefined>()
  const [editProc554, setEditProc554] = useState<Procedure | 'new' | undefined>()
  const [search, setSearch] = useState('')
  const [search554, setSearch554] = useState('')

  const mapProc = (r: Record<string, unknown>): Procedure => ({
    id: r.id as string, name: r.name as string, category: r.category as string,
    field: (r.field as string) || 'anaesthesiology', sort: (r.sort as number) || 0,
    active: r.active as boolean, graduation_target: (r.graduation_target as number) || null,
    featured: !!(r.featured),
  })

  const loadProcedures = useCallback(async () => {
    const recs = await pb.collection('procedures').getFullList({ sort: 'category,sort,name' })
    setProcedures(recs.filter(r => !r.field || r.field === 'anaesthesiology').map(mapProc))
    setProcs554(recs.filter(r => r.field === '554n').map(mapProc))
  }, [])

  const loadOverdue = useCallback(async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const recs = await pb.collection('logbook_entries').getFullList({
      filter: `status = 'submitted' && submitted_at != '' && submitted_at <= '${cutoffStr}'`,
      sort: 'submitted_at',
      expand: 'resident,procedure',
    }).catch(() => [])
    const today = new Date()
    setOverdue(recs.map(r => {
      const expR = (r.expand as Record<string, Record<string, unknown>>)?.resident
      const expP = (r.expand as Record<string, Record<string, unknown>>)?.procedure
      const sub = new Date((r.submitted_at as string) + 'T00:00:00')
      const days = Math.floor((today.getTime() - sub.getTime()) / 86400000)
      return {
        id: r.id,
        resident_name: (expR?.full_name as string) || '—',
        procedure_name: (expP?.name as string) || '—',
        date: r.date as string,
        submitted_at: r.submitted_at as string,
        days,
      }
    }))
  }, [])

  const loadAudit = useCallback(async () => {
    const recs = await pb.collection('audit_log').getFullList({
      sort: '-at', perPage: 200, expand: 'actor',
    }).catch(() => [])
    setAuditRows(recs.map(r => {
      const actor = (r.expand as Record<string, Record<string, unknown>>)?.actor
      return {
        id: r.id,
        entry_id: (r.entry as string) || '',
        actor_name: (actor?.full_name as string) || '—',
        action: r.action as string,
        at: r.at as string,
        before: (r.before as string) || '',
        after: (r.after as string) || '',
      }
    }))
  }, [])

  const loadApproved = useCallback(async () => {
    const recs = await pb.collection('logbook_entries').getFullList({
      filter: "status = 'approved'",
      sort: '-date',
      expand: 'resident,procedure,supervisor',
    }).catch(() => [])
    setApproved(recs.map(r => {
      const expR = (r.expand as Record<string, Record<string, unknown>>)?.resident
      const expP = (r.expand as Record<string, Record<string, unknown>>)?.procedure
      const expS = (r.expand as Record<string, Record<string, unknown>>)?.supervisor
      return {
        id: r.id,
        resident_name: (expR?.full_name as string) || '—',
        procedure_name: (expP?.name as string) || '—',
        category: (expP?.category as string) || '—',
        date: r.date as string,
        count: r.count as number,
        complexity: r.complexity as string,
        resident_level: r.resident_level as number,
        supervisor_level: (r.supervisor_level as number) || null,
        supervisor_name: (expS?.full_name as string) || '—',
        reviewed_at: (r.reviewed_at as string) || '',
      }
    }))
  }, [])

  useEffect(() => {
    Promise.all([loadProcedures(), loadOverdue(), loadAudit(), loadApproved()])
      .finally(() => setLoading(false))
  }, [loadProcedures, loadOverdue, loadAudit, loadApproved])

  function exportCsv() {
    const header = 'Ординатор,Манипуляция,Категория,Дата,Кол-во,Сложность,Ур.ординатора,Ур.руководителя,Руководитель,Проверено'
    const rows = approved.map(r =>
      [r.resident_name, r.procedure_name, r.category, r.date, r.count, r.complexity,
       r.resident_level, r.supervisor_level ?? '', r.supervisor_name, r.reviewed_at]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'logbook_approved.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function toggleFeatured(p: Procedure) {
    await pb.collection('procedures').update(p.id, { featured: !p.featured }).catch(() => {})
    await loadProcedures()
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

  if (loading) return (
    <AppShell title="Логбук — Управление" showBack>
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  const filtered554 = procs554.filter(p =>
    !search554 || p.name.toLowerCase().includes(search554.toLowerCase()) || p.category.toLowerCase().includes(search554.toLowerCase())
  )
  const byCategory554 = filtered554.reduce<Record<string, Procedure[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <AppShell title="Логбук — Управление" showBack>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex rounded-xl bg-stone-100 p-1 gap-1 overflow-x-auto max-w-2xl">
          {(['procedures', 'overdue', 'audit', 'export'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 min-w-max rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors whitespace-nowrap',
                tab === t ? 'bg-white text-stone-900 shadow' : 'text-stone-500'
              )}
            >
              {t === 'procedures' ? 'Манипуляции' : t === 'overdue' ? `Просрочено${overdue.length ? ` (${overdue.length})` : ''}` : t === 'audit' ? 'Журнал' : 'Экспорт'}
            </button>
          ))}
        </div>

        {/* ── PROCEDURES TAB ── two-column: existing list | 554н reference */}
        {tab === 'procedures' && (
          <div className="grid grid-cols-2 gap-4 items-start">

            {/* ── Left: managed procedure list ── */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск…"
                  className="flex-1 rounded-xl bg-stone-100 px-4 py-2 text-sm text-stone-900 outline-none"
                />
                <button
                  onClick={() => setEditProc('new')}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus size={14} /> Добавить
                </button>
              </div>
              <p className="text-xs text-stone-400 px-1">{procedures.length} манипуляций · {procedures.filter(p => !p.active).length} скрыто</p>

              {/* ── Featured / pinned section ── */}
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star size={11} className="text-amber-500 fill-amber-500" />
                    <span className="text-xs font-semibold text-amber-800">Часто используемые</span>
                  </div>
                  <span className="text-xs text-amber-500">{featuredProcs.length}</span>
                </div>
                {featuredProcs.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-stone-400 italic">Нажмите ☆, чтобы закрепить</p>
                ) : (
                  <div className="divide-y divide-amber-100">
                    {featuredProcs.map(p => (
                      <div key={p.id} className={cn('flex items-center gap-2 px-3 py-1.5', !p.active && 'opacity-40')}>
                        <p className="flex-1 text-xs text-stone-900 truncate">{p.name}</p>
                        <span className="text-[10px] text-stone-400 shrink-0">{p.category}</span>
                        <button onClick={() => toggleFeatured(p)} title="Открепить">
                          <Star size={13} className="text-amber-400 fill-amber-400 hover:fill-stone-300 hover:text-stone-300 transition-colors" />
                        </button>
                        <button onClick={() => setEditProc(p)} className="text-stone-400 hover:text-stone-700">
                          <Pencil size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, procs]) => (
                <div key={cat} className="rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-3 py-1.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-600">{cat}</span>
                    <span className="text-[10px] text-stone-400">{procs.length}</span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {procs.map(p => (
                      <div key={p.id} className={cn('flex items-center gap-2 px-3 py-1.5', !p.active && 'opacity-40')}>
                        <p className="flex-1 text-xs text-stone-900 truncate">{p.name}</p>
                        {!p.active && <span className="text-[10px] text-stone-400 shrink-0">скрыта</span>}
                        {p.graduation_target && <span className="text-[10px] text-stone-400 shrink-0">/{p.graduation_target}</span>}
                        <button onClick={() => toggleFeatured(p)} title={p.featured ? 'Открепить' : 'Закрепить'}>
                          <Star size={13} className={cn(
                            'transition-colors',
                            p.featured ? 'text-amber-400 fill-amber-400' : 'text-stone-300 fill-transparent hover:text-amber-300'
                          )} />
                        </button>
                        <button onClick={() => setEditProc(p)} className="text-stone-400 hover:text-stone-700">
                          <Pencil size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Right: 554н management panel ── */}
            <div className="space-y-3 sticky top-4">
              <div className="flex gap-2">
                <input
                  value={search554}
                  onChange={e => setSearch554(e.target.value)}
                  placeholder="Поиск по 554н…"
                  className="flex-1 rounded-xl bg-stone-100 px-4 py-2 text-sm text-stone-900 outline-none"
                />
                <button
                  onClick={() => setEditProc554('new')}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus size={14} /> Добавить
                </button>
              </div>
              <p className="text-xs text-stone-400 px-1">
                Приказ 554н · {procs554.length} умений · {procs554.filter(p => !p.active).length} скрыто
              </p>
              <div className="max-h-[75vh] overflow-y-auto space-y-2 pr-0.5">
                {Object.entries(byCategory554).sort(([a], [b]) => a.localeCompare(b)).map(([cat, procs]) => (
                  <div key={cat} className="rounded-xl border border-stone-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-600">{cat}</span>
                      <span className="text-[10px] text-stone-400">{procs.length}</span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {procs.map(p => (
                        <div key={p.id} className={cn('flex items-center gap-2 px-3 py-1.5', !p.active && 'opacity-40')}>
                          <p className="flex-1 text-xs text-stone-900 truncate">{p.name}</p>
                          {!p.active && <span className="text-[10px] text-stone-400 shrink-0">скрыта</span>}
                          <button
                            onClick={() => setEditProc554(p)}
                            className="text-stone-400 hover:text-stone-700 shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filtered554.length === 0 && (
                  <p className="text-center text-xs text-stone-400 py-8 italic">Нет совпадений</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── OVERDUE TAB ── */}
        {tab === 'overdue' && (
          <div className="max-w-sm space-y-3">
            <p className="text-xs text-stone-400 px-1">Записи без проверки более 14 дней</p>
            {overdue.length === 0 ? (
              <p className="text-center text-sm text-stone-400 py-8 italic">Нет просроченных записей</p>
            ) : (
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {overdue.map(e => (
                    <div key={e.id} className="px-4 py-3 flex items-start gap-3">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{e.procedure_name}</p>
                        <p className="text-xs text-stone-500">{e.resident_name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Отправлено: {new Date(e.submitted_at + 'T00:00:00').toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-red-500 shrink-0">{e.days} дн.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {tab === 'audit' && (
          <div className="max-w-sm space-y-3">
            <p className="text-xs text-stone-400 px-1">Последние 200 событий</p>
            {auditRows.length === 0 ? (
              <p className="text-center text-sm text-stone-400 py-8 italic">Журнал пуст</p>
            ) : (
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {auditRows.map(row => (
                    <div key={row.id} className="px-4 py-2.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-900">{row.action}</p>
                        <p className="text-xs text-stone-400 truncate">{row.actor_name}</p>
                      </div>
                      <p className="text-[10px] text-stone-400 shrink-0">
                        {new Date(row.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPORT TAB ── */}
        {tab === 'export' && (
          <div className="max-w-sm space-y-4">
            <div className="rounded-xl border border-stone-200 bg-brand-light px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-stone-900">Принятые записи</p>
              <p className="text-xs text-stone-400">{approved.length} записей · CSV</p>
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white"
              >
                <Download size={14} /> Скачать CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {editProc !== undefined && (
        <ProcModal
          proc={editProc === 'new' ? undefined : editProc}
          field="anaesthesiology"
          onSave={loadProcedures}
          onClose={() => setEditProc(undefined)}
        />
      )}
      {editProc554 !== undefined && (
        <ProcModal
          proc={editProc554 === 'new' ? undefined : editProc554}
          field="554n"
          onSave={loadProcedures}
          onClose={() => setEditProc554(undefined)}
        />
      )}
    </AppShell>
  )
}
