import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import {
  ChevronDown, ChevronUp, Plus, Trash2,
  FileText, ExternalLink, AlertCircle, CheckCircle2, Clock, Loader2,
} from 'lucide-react'
import type { IndividualPlanData, PracticeMonth, Publication, Conference, SubmissionStatus } from '../../types/documents'
import { emptyPlan, emptyMonth, emptyPub, emptyConf } from '../../types/documents'

const GEN_SERVICE = 'https://gen.ordinemmed.ru'

/* ─── Helpers ─────────────────────────────────────────────────────── */

function Field({
  label, value, onChange, placeholder, type = 'text', className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs text-stone-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
      />
    </div>
  )
}

/* ─── Practice month row ──────────────────────────────────────────── */

function MonthRow({
  month, data, onChange,
}: { month: number; data: PracticeMonth; onChange: (v: PracticeMonth) => void }) {
  const [open, setOpen] = useState(false)
  const filled = !!(data.workplace || data.diagnosis || data.procedures)

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors"
      >
        <span className={cn('text-xs font-semibold w-6 shrink-0', filled ? 'text-brand-accent' : 'text-stone-300')}>
          М{month}
        </span>
        <span className="flex-1 text-xs text-stone-500 text-left truncate">
          {data.workplace || <span className="text-stone-300">не заполнено</span>}
        </span>
        {open ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
      </button>
      {open && (
        <div className="border-t border-stone-100 px-3 py-3 space-y-2 bg-white">
          <Field label="Место прохождения практики" value={data.workplace} onChange={v => onChange({ ...data, workplace: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Диагноз / нозология" value={data.diagnosis} onChange={v => onChange({ ...data, diagnosis: v })} />
            <Field label="Кол-во пациентов" value={data.patient_count} onChange={v => onChange({ ...data, patient_count: v })} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Дежурства: место" value={data.duty_place} onChange={v => onChange({ ...data, duty_place: v })} />
            <Field label="Дежурства: даты / кол-во" value={data.duty_dates} onChange={v => onChange({ ...data, duty_dates: v })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Диагностические и лечебные манипуляции</label>
            <textarea
              value={data.procedures}
              onChange={e => onChange({ ...data, procedures: e.target.value })}
              rows={3}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Status badge ────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    draft:       { label: 'Черновик',     cls: 'bg-stone-100 text-stone-500',   icon: <Clock size={12} /> },
    submitted:   { label: 'Отправлен',   cls: 'bg-sky-100 text-sky-600',       icon: <Clock size={12} /> },
    generating:  { label: 'Генерация…',  cls: 'bg-amber-100 text-amber-600',   icon: <Loader2 size={12} className="animate-spin" /> },
    done:        { label: 'Готов',        cls: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={12} /> },
    error:       { label: 'Ошибка',      cls: 'bg-red-100 text-red-500',       icon: <AlertCircle size={12} /> },
    token_error: { label: 'Токен истёк', cls: 'bg-orange-100 text-orange-600', icon: <AlertCircle size={12} /> },
  }
  const { label, cls, icon } = map[status] ?? map.draft
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
      {icon}{label}
    </span>
  )
}

/* ─── Main page ───────────────────────────────────────────────────── */

type Step = 'info' | 'education' | 'practice1' | 'practice2' | 'research'

const STEPS: { key: Step; label: string }[] = [
  { key: 'info',      label: 'Данные'    },
  { key: 'education', label: 'Учёба'     },
  { key: 'practice1', label: 'Практика 1' },
  { key: 'practice2', label: 'Практика 2' },
  { key: 'research',  label: 'НИР'       },
]

export function DocumentsPage() {
  const { appUser } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [status, setStatus]         = useState<SubmissionStatus>('draft')
  const [yandexUrl, setYandexUrl]   = useState('')
  const [data, setData]             = useState<IndividualPlanData>(emptyPlan())
  const [step, setStep]             = useState<Step>('info')
  const [saving, setSaving]         = useState(false)
  const [generating, setGenerating] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!appUser) return
    pb.collection('document_submissions')
      .getFirstListItem(`resident = '${appUser.id}'`)
      .then(rec => {
        setSubmissionId(rec.id)
        setStatus(rec.status as SubmissionStatus)
        setYandexUrl((rec.yandex_url as string) || '')
        const saved = rec.data as IndividualPlanData
        setData({
          ...emptyPlan(appUser.fullName),
          ...saved,
          practice1: Array.from({ length: 11 }, (_, i) => ({ ...emptyMonth(), ...(saved.practice1?.[i] ?? {}) })),
          practice2: Array.from({ length: 11 }, (_, i) => ({ ...emptyMonth(), ...(saved.practice2?.[i] ?? {}) })),
        })
        setLoading(false)
      })
      .catch(() => {
        setData(emptyPlan(appUser.fullName))
        setLoading(false)
      })
  }, [appUser])

  function update(partial: Partial<IndividualPlanData>) {
    setData(prev => {
      const next = { ...prev, ...partial }
      scheduleSave(next)
      return next
    })
  }

  function scheduleSave(latest: IndividualPlanData) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(latest), 1500)
  }

  async function persist(d: IndividualPlanData) {
    if (!appUser) return
    setSaving(true)
    try {
      if (submissionId) {
        await pb.collection('document_submissions').update(submissionId, { data: d, status: 'draft' })
      } else {
        const rec = await pb.collection('document_submissions').create({
          resident: appUser.id,
          data: d,
          status: 'draft',
          yandex_url: '',
          error_msg: '',
        })
        setSubmissionId(rec.id)
      }
      setStatus('draft')
    } catch { /* silent */ }
    setSaving(false)
  }

  async function generate() {
    if (!submissionId && appUser) {
      await persist(data)
    }
    setGenerating(true)
    setStatus('generating')
    try {
      const res = await fetch(`${GEN_SERVICE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })
      const json = await res.json()
      if (json.url) {
        setYandexUrl(json.url)
        setStatus('done')
      } else {
        setStatus(json.token_error ? 'token_error' : 'error')
      }
    } catch {
      setStatus('error')
    }
    setGenerating(false)
  }

  function updateMonth(year: 1 | 2, idx: number, val: PracticeMonth) {
    const key = year === 1 ? 'practice1' : 'practice2'
    const arr = [...data[key]]
    arr[idx] = val
    update({ [key]: arr })
  }

  function addPub() { update({ publications: [...data.publications, emptyPub()] }) }
  function removePub(i: number) { update({ publications: data.publications.filter((_, j) => j !== i) }) }
  function updatePub(i: number, p: Publication) {
    const arr = [...data.publications]; arr[i] = p; update({ publications: arr })
  }

  function addConfTalk() { update({ conf_talks: [...data.conf_talks, emptyConf()] }) }
  function removeConfTalk(i: number) { update({ conf_talks: data.conf_talks.filter((_, j) => j !== i) }) }
  function updateConfTalk(i: number, c: Conference) {
    const arr = [...data.conf_talks]; arr[i] = c; update({ conf_talks: arr })
  }

  function addConfAtt() { update({ conf_attended: [...data.conf_attended, emptyConf()] }) }
  function removeConfAtt(i: number) { update({ conf_attended: data.conf_attended.filter((_, j) => j !== i) }) }
  function updateConfAtt(i: number, c: Conference) {
    const arr = [...data.conf_attended]; arr[i] = c; update({ conf_attended: arr })
  }

  if (loading) return (
    <AppShell title="Документы">
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Индивидуальный план">
      <div className="space-y-4">

        {/* Status row */}
        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-brand-light px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-stone-400" />
            <span className="text-sm font-medium text-stone-800">Индивидуальный план</span>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-stone-400">Сохранение…</span>}
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Download link */}
        {(status === 'done' && yandexUrl) && (
          <a
            href={yandexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600"
          >
            <ExternalLink size={15} />
            Скачать документ с Яндекс.Диска
          </a>
        )}

        {/* Token error */}
        {status === 'token_error' && (
          <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>Токен Яндекс.Диска истёк. Уведомите администратора для обновления.</span>
          </div>
        )}

        {/* Step tabs */}
        <div className="flex overflow-x-auto gap-1 rounded-xl bg-stone-100 p-1 no-scrollbar">
          {STEPS.map(s => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={cn(
                'flex-1 min-w-max rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors whitespace-nowrap',
                step === s.key ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ─── Step: info ─────────────────────────────────────────── */}
        {step === 'info' && (
          <div className="space-y-3">
            <Field label="ФИО (именительный, напр. Иванов Иван Иванович)" value={data.full_name} onChange={v => update({ full_name: v })} />
            <Field label="ФИО (родительный, напр. Иванова Ивана Ивановича)" value={data.full_name_gen} onChange={v => update({ full_name_gen: v })} />
            <Field label="Специальность" value={data.specialty} onChange={v => update({ specialty: v })} />
            <Field label="Кафедра" value={data.department} onChange={v => update({ department: v })} />
            <Field label="Руководитель" value={data.supervisor_name} onChange={v => update({ supervisor_name: v })} />
            <Field label="Заведующий кафедрой" value={data.dept_head} onChange={v => update({ dept_head: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Дата зачисления" value={data.enrollment_date} onChange={v => update({ enrollment_date: v })} type="date" />
              <Field label="Приказ № (зачисление)" value={data.enrollment_order} onChange={v => update({ enrollment_order: v })} placeholder="№" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Дата окончания" value={data.expulsion_date} onChange={v => update({ expulsion_date: v })} type="date" />
              <Field label="Приказ № (окончание)" value={data.expulsion_order} onChange={v => update({ expulsion_order: v })} placeholder="№" />
            </div>
          </div>
        )}

        {/* ─── Step: education ────────────────────────────────────── */}
        {step === 'education' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Аттестация</p>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Дата аттестации — Год 1" value={data.att1_date} onChange={v => update({ att1_date: v })} type="date" />
                  <Field label="Протокол №" value={data.att1_protocol} onChange={v => update({ att1_protocol: v })} placeholder="№" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Дата аттестации — Год 2" value={data.att2_date} onChange={v => update({ att2_date: v })} type="date" />
                  <Field label="Протокол №" value={data.att2_protocol} onChange={v => update({ att2_protocol: v })} placeholder="№" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Учебный план — Оценки</p>
              </div>
              <div className="px-4 py-3 space-y-3">
                {[
                  { label: 'Основная специальность (сем. 1)', key: 'grade_main_s1' },
                  { label: 'Основная специальность (сем. 2)', key: 'grade_main_s2' },
                  { label: 'Основная специальность (сем. 3)', key: 'grade_main_s3' },
                  { label: 'Основная специальность (сем. 4)', key: 'grade_main_s4' },
                  { label: 'Медицина чрезвычайных ситуаций', key: 'grade_emergency' },
                  { label: 'Педагогика', key: 'grade_pedagogy' },
                  { label: 'Общественное здоровье', key: 'grade_pubhealth' },
                  { label: 'Патология', key: 'grade_pathology' },
                  { label: 'Дисциплина кафедры 1', key: 'grade_dept1' },
                  { label: 'Дисциплина кафедры 2', key: 'grade_dept2' },
                  { label: 'Дисциплина по выбору 1', key: 'grade_elec1' },
                  { label: 'Дисциплина по выбору 2', key: 'grade_elec2' },
                  { label: 'Дисциплина по выбору 3', key: 'grade_elec3' },
                  { label: 'Симуляционный курс ЦСО', key: 'grade_sim_cso' },
                  { label: 'Симуляционный курс сем. 1', key: 'grade_sim1' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-stone-700">{label}</span>
                    <input
                      type="text"
                      value={data[key as keyof IndividualPlanData] as string}
                      onChange={e => update({ [key]: e.target.value } as Partial<IndividualPlanData>)}
                      placeholder="—"
                      className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-center text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step: practice1 ────────────────────────────────────── */}
        {step === 'practice1' && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 px-1">Год 1 — нажмите на месяц чтобы заполнить</p>
            {data.practice1.map((m, i) => (
              <MonthRow
                key={i}
                month={i + 1}
                data={m}
                onChange={val => updateMonth(1, i, val)}
              />
            ))}
          </div>
        )}

        {/* ─── Step: practice2 ────────────────────────────────────── */}
        {step === 'practice2' && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 px-1">Год 2 — нажмите на месяц чтобы заполнить</p>
            {data.practice2.map((m, i) => (
              <MonthRow
                key={i}
                month={i + 1}
                data={m}
                onChange={val => updateMonth(2, i, val)}
              />
            ))}
          </div>
        )}

        {/* ─── Step: research ─────────────────────────────────────── */}
        {step === 'research' && (
          <div className="space-y-3">
            <Field label="Тема научно-исследовательской работы" value={data.research_topic} onChange={v => update({ research_topic: v })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-stone-400">Статус НИР</label>
                <select
                  value={data.research_passed}
                  onChange={e => update({ research_passed: e.target.value })}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                >
                  <option value="">—</option>
                  <option value="зачтено">Зачтено</option>
                  <option value="не зачтено">Не зачтено</option>
                </select>
              </div>
              <Field label="Дата" value={data.research_date} onChange={v => update({ research_date: v })} type="date" />
            </div>

            {/* Publications */}
            <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Публикации</p>
                <button onClick={addPub} className="text-stone-400 hover:text-brand-accent"><Plus size={15} /></button>
              </div>
              {data.publications.length === 0 ? (
                <p className="px-4 py-3 text-xs text-stone-300">Нет публикаций</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data.publications.map((p, i) => (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 font-medium">#{i + 1}</span>
                        <button onClick={() => removePub(i)} className="ml-auto text-stone-300 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                      <Field label="Название" value={p.title} onChange={v => updatePub(i, { ...p, title: v })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Соавторы" value={p.coauthors} onChange={v => updatePub(i, { ...p, coauthors: v })} />
                        <Field label="Издание" value={p.publisher} onChange={v => updatePub(i, { ...p, publisher: v })} />
                      </div>
                      <Field label="Год" value={p.year} onChange={v => updatePub(i, { ...p, year: v })} placeholder="2025" className="w-24" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conference talks */}
            <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Выступления на конференциях</p>
                <button onClick={addConfTalk} className="text-stone-400 hover:text-brand-accent"><Plus size={15} /></button>
              </div>
              {data.conf_talks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-stone-300">Нет выступлений</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data.conf_talks.map((c, i) => (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 font-medium">#{i + 1}</span>
                        <button onClick={() => removeConfTalk(i)} className="ml-auto text-stone-300 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                      <Field label="Тема доклада" value={c.topic} onChange={v => updateConfTalk(i, { ...c, topic: v })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Дата" value={c.date} onChange={v => updateConfTalk(i, { ...c, date: v })} type="date" />
                        <Field label="Место проведения" value={c.place} onChange={v => updateConfTalk(i, { ...c, place: v })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conference attendance */}
            <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Участие в конференциях</p>
                <button onClick={addConfAtt} className="text-stone-400 hover:text-brand-accent"><Plus size={15} /></button>
              </div>
              {data.conf_attended.length === 0 ? (
                <p className="px-4 py-3 text-xs text-stone-300">Нет записей</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data.conf_attended.map((c, i) => (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 font-medium">#{i + 1}</span>
                        <button onClick={() => removeConfAtt(i)} className="ml-auto text-stone-300 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                      <Field label="Название конференции" value={c.topic} onChange={v => updateConfAtt(i, { ...c, topic: v })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Дата" value={c.date} onChange={v => updateConfAtt(i, { ...c, date: v })} type="date" />
                        <Field label="Место" value={c.place} onChange={v => updateConfAtt(i, { ...c, place: v })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating || status === 'generating'}
          className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating || status === 'generating' ? (
            <><Loader2 size={15} className="animate-spin" /> Генерация…</>
          ) : status === 'done' ? (
            'Обновить документ'
          ) : (
            'Создать документ на Яндекс.Диске'
          )}
        </button>
      </div>
    </AppShell>
  )
}
