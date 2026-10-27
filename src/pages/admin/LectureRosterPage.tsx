import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import {
  DndContext, DragOverlay, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'

import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, User, Pencil, MapPin, Download } from 'lucide-react'
import { exportTimetableDocx } from '../../lib/exportTimetableDocx'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Topic        { id: string; title: string; color: string; specialization: string }
interface LecturerEntry { id: string; name: string; color: string }
interface LocationEntry { id: string; name: string }
interface RosterLecture {
  id: string; title: string; lecturer_name: string; group_name: string
  date: string; start_time: string; color: string; notes: string; location: string
}
interface Group {
  kurator?: string
  student_count?: number
  id: string; name: string; start_date: string; end_date: string; specialty: string
}

const SPECIALTIES = [
  { id: 'air',  label: 'Анестезиология и реаниматология', abbr: 'АиР', color: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'    },
  { id: 'rb',   label: 'Реабилитация',                    abbr: 'РБ',  color: 'green',  bg: 'bg-emerald-100',text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { id: 'ms',   label: 'Медсестры',                       abbr: 'МС',  color: 'pink',   bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-400'    },
  { id: 'kzh',  label: 'Кружок',                          abbr: 'КЖ',  color: 'amber',  bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400'   },
]
const specialtyFor = (id: string) => SPECIALTIES.find(s => s.id === id) ?? null

/* ─── Colors ─────────────────────────────────────────────────────── */
const COLORS = [
  { id: 'blue',   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  { id: 'purple', bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400'  },
  { id: 'green',  bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { id: 'orange', bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400'  },
  { id: 'pink',   bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-400'    },
  { id: 'amber',  bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
]
const colorFor = (id: string) => COLORS.find(c => c.id === id) ?? COLORS[0]

/* ─── Helpers ────────────────────────────────────────────────────── */
const DOW_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

/* ─── Droppable calendar cell ────────────────────────────────────── */
function DroppableCell({
  date, isSelected, isToday, dayNum, onSelect,
}: {
  date: string
  isSelected: boolean
  isToday: boolean
  dayNum: number
  onSelect: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day::${date}`, data: { date } })
  const isSunday = new Date(date + 'T00:00:00').getDay() === 0

  return (
    <div
      ref={setNodeRef}
      onClick={isSunday ? undefined : onSelect}
      className={cn(
        'flex flex-col items-center py-1 transition-colors min-h-[36px]',
        isSunday
          ? 'opacity-35 cursor-not-allowed'
          : isOver
          ? 'bg-brand-accent/15 ring-1 ring-brand-accent cursor-pointer rounded-lg'
          : isSelected
          ? 'bg-brand-accent/10 ring-1 ring-brand-accent/40 cursor-pointer rounded-lg'
          : 'hover:bg-stone-50 cursor-pointer',
      )}
    >
      <span
        className={cn(
          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
          isSunday
            ? 'text-red-400'
            : isSelected
            ? 'bg-brand-accent text-white'
            : isToday
            ? 'ring-1 ring-blue-400 text-blue-400'
            : 'text-stone-700',
        )}
      >
        {dayNum}
      </span>
    </div>
  )
}

const ZACHET_TITLE = 'Зачёт. Контроль знаний. Защита истории болезни'

/* ─── Lecture edit/create modal ──────────────────────────────────── */
function LectureModal({
  lecture, lecturers, groups, locations, topics, isLastDay, editableDate, onSave, onDelete, onClose,
}: {
  lecture: Partial<RosterLecture> & { date: string; title: string; color: string }
  lecturers: LecturerEntry[]
  groups: Group[]
  locations: LocationEntry[]
  topics: Topic[]
  isLastDay?: boolean
  editableDate?: boolean
  onSave: (data: Partial<RosterLecture> & { date: string }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const preselectedTopicId = topics.find(t => t.title === lecture.title)?.id ?? (lecture.title ? '__custom__' : '')
  const [topicId,        setTopicId]        = useState(preselectedTopicId)
  const [customTitle,    setCustomTitle]    = useState(topicId === '__custom__' ? lecture.title : '')
  const [date,           setDate]           = useState(lecture.date)
  const [time,           setTime]           = useState(lecture.start_time || '09:00')
  // Single-select lecturer (normal days)
  const [lecturerName,   setLecturerName]   = useState(lecture.lecturer_name ?? '')
  const [customName,     setCustomName]     = useState('')
  // Multi-select lecturers (last day / зачёт)
  const [multiLecturers, setMultiLecturers] = useState<string[]>(() =>
    isLastDay && lecture.lecturer_name
      ? lecture.lecturer_name.split(',').map(s => s.trim()).filter(Boolean)
      : []
  )
  const [multiCustom,    setMultiCustom]    = useState('')
  const [groupName,      setGroupName]      = useState(lecture.group_name ?? '')
  const [location,       setLocation]       = useState(lecture.location ?? '')
  const [notes,          setNotes]          = useState(lecture.notes ?? '')
  const colorForGroup = (name: string) => {
    const g = groups.find(g => g.name === name)
    return g?.specialty ? (specialtyFor(g.specialty)?.color ?? lecture.color) : lecture.color
  }
  const [color, setColor] = useState(() => colorForGroup(lecture.group_name ?? ''))
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  const isCustomLecturer = lecturerName === '__custom__'

  const selectedTopic  = topics.find(t => t.id === topicId)
  const effectiveTitle = topicId === '__custom__' ? customTitle : (selectedTopic?.title ?? '')
  const effectiveColor = topicId === '__custom__' ? color : (selectedTopic?.color ?? color)
  const effectiveName  = isLastDay
    ? [...multiLecturers, ...(multiCustom.trim() ? [multiCustom.trim()] : [])].join(', ')
    : isCustomLecturer ? customName : lecturerName

  function toggleMultiLecturer(name: string) {
    setMultiLecturers(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  async function save() {
    if (!effectiveTitle.trim() || !date) return
    setSaving(true)
    await onSave({ title: effectiveTitle.trim(), date, start_time: time, lecturer_name: effectiveName, group_name: groupName, location, color: effectiveColor, notes })
    setSaving(false)
  }
  async function del() {
    if (!onDelete) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {lecture.id ? 'Редактировать лекцию' : 'Новая лекция'}{!editableDate && dateLabel ? ` · ${dateLabel}` : ''}
          </span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        {topics.length > 0 ? (
          <select
            autoFocus
            value={topicId}
            onChange={e => {
              setTopicId(e.target.value)
              if (e.target.value !== '__custom__') setCustomTitle('')
            }}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <option value="">— Тема лекции —</option>
            {SPECIALTIES.map(sp => {
              const spTopics = topics.filter(t => (t.specialization || 'air') === sp.id)
              if (spTopics.length === 0) return null
              return (
                <optgroup key={sp.id} label={`${sp.abbr} — ${sp.label}`}>
                  {spTopics.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
              )
            })}
            <option value="__custom__">Другое…</option>
          </select>
        ) : (
          <input
            autoFocus
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder="Тема лекции"
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          />
        )}
        {topicId === '__custom__' && (
          <input
            autoFocus
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder="Введите тему лекции"
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          />
        )}

        {editableDate && (
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <span className="text-xs text-stone-400 shrink-0">Дата</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
          <Clock size={14} className="text-stone-400 shrink-0" />
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
          />
        </div>

        {isLastDay ? (
          <div className="rounded-xl bg-stone-100 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-2 pb-1 border-b border-stone-200">
              <User size={14} className="text-stone-400 shrink-0" />
              <span className="text-xs text-stone-500">Преподаватели (зачёт)</span>
            </div>
            {lecturers.map(l => (
              <label key={l.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="checkbox"
                  checked={multiLecturers.includes(l.name)}
                  onChange={() => toggleMultiLecturer(l.name)}
                  className="accent-brand-accent w-3.5 h-3.5"
                />
                <span className="text-sm text-stone-800">{l.name}</span>
              </label>
            ))}
            <input
              value={multiCustom}
              onChange={e => setMultiCustom(e.target.value)}
              placeholder="Добавить другого…"
              className="w-full bg-transparent text-sm text-stone-500 outline-none pt-1 border-t border-stone-200"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
              <User size={14} className="text-stone-400 shrink-0" />
              <select
                value={lecturerName}
                onChange={e => setLecturerName(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              >
                <option value="">— Лектор не выбран —</option>
                {lecturers.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
                <option value="__custom__">Другой…</option>
              </select>
            </div>
            {isCustomLecturer && (
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Введите имя лектора"
                className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
              />
            )}
          </>
        )}

        {groups.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <span className="text-xs text-stone-400 shrink-0">Группа</span>
            <select
              value={groupName}
              onChange={e => {
                setGroupName(e.target.value)
                setColor(colorForGroup(e.target.value))
              }}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            >
              <option value="">— не выбрана —</option>
              {groups.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
          <MapPin size={14} className="text-stone-400 shrink-0" />
          {locations.length > 0 ? (
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            >
              <option value="">— место не выбрано —</option>
              {locations.map(l => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
              <option value="__custom__">Другое…</option>
            </select>
          ) : (
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Место проведения"
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            />
          )}
        </div>
        {location === '__custom__' && (
          <input
            value=""
            onChange={e => setLocation(e.target.value)}
            placeholder="Введите место"
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          />
        )}

        <div className="flex gap-2">
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={cn(
                'w-7 h-7 rounded-full transition-transform',
                c.dot,
                color === c.id && 'ring-2 ring-offset-1 ring-stone-400 scale-110',
              )}
            />
          ))}
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Заметки (необязательно)"
          rows={2}
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
        />

        <div className="flex gap-2">
          {onDelete && (
            <button
              onClick={del}
              disabled={deleting}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100 disabled:opacity-40"
            >
              {deleting ? '…' : <Trash2 size={15} />}
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !effectiveTitle.trim() || !date}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Topic modal (add + edit) ───────────────────────────────────── */
function TopicModal({
  topic, onSave, onDelete, onClose,
}: {
  topic?: Topic                          // undefined = add mode
  onSave: (t: Topic) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const [title,          setTitle]          = useState(topic?.title ?? '')
  const [specialization, setSpecialization] = useState(topic?.specialization ?? 'air')
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const isEdit = !!(topic?.id)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (isEdit) {
        await pb.collection('lecture_topics').update(topic!.id, { title: title.trim(), specialization })
        onSave({ ...topic!, title: title.trim(), specialization })
      } else {
        const rec = await pb.collection('lecture_topics').create({ title: title.trim(), color: 'blue', specialization })
        onSave({ id: rec.id, title: rec.title as string, color: (rec.color as string) || 'blue', specialization: (rec.specialization as string) || specialization })
      }
      onClose()
    } catch (e) {
      console.error('TopicModal save error:', e)
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!topic || !onDelete) return
    setDeleting(true)
    await pb.collection('lecture_topics').delete(topic.id)
    onDelete(topic.id)
    setDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать лекцию' : 'Новая лекция'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <input
          autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Название лекции"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map(sp => (
            <button
              key={sp.id}
              type="button"
              onClick={() => setSpecialization(sp.id)}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold border-2 transition-colors text-left',
                specialization === sp.id
                  ? `${sp.bg} ${sp.text} border-transparent`
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'
              )}
            >
              <span className="font-bold">{sp.abbr}</span>
              <span className="block text-[10px] font-normal mt-0.5 leading-tight">{sp.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={del} disabled={deleting}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100 disabled:opacity-40"
            >
              {deleting ? '…' : <Trash2 size={15} />}
            </button>
          )}
          <button
            onClick={save} disabled={saving || !title.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Lecturer modal (add + edit) ────────────────────────────────── */
function LecturerModal({
  lecturer, onSave, onDelete, onClose,
}: {
  lecturer?: LecturerEntry
  onSave: (l: LecturerEntry) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEdit = !!lecturer
  const [name,  setName]  = useState(lecturer?.name  ?? '')
  const [color, setColor] = useState(lecturer?.color ?? 'blue')

  function save() {
    if (!name.trim()) return
    onSave(isEdit ? { ...lecturer!, name: name.trim(), color } : { id: `lec_${Date.now()}`, name: name.trim(), color })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать лектора' : 'Новый лектор'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="ФИО лектора"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all', c.bg, c.text,
                color === c.id ? 'ring-2 ring-offset-1 ring-stone-400 scale-105' : 'opacity-60')}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
              {c.id}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {isEdit && onDelete && (
            <button
              onClick={() => { onDelete(lecturer!.id); onClose() }}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={save} disabled={!name.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Location modal (add + edit) ───────────────────────────────── */
function LocationModal({
  location, onSave, onDelete, onClose,
}: {
  location?: LocationEntry
  onSave: (l: LocationEntry) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEdit = !!location
  const [name, setName] = useState(location?.name ?? '')

  function save() {
    if (!name.trim()) return
    onSave(isEdit ? { ...location!, name: name.trim() } : { id: `loc_${Date.now()}`, name: name.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать место' : 'Новое место'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Название места"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <div className="flex gap-2">
          {isEdit && onDelete && (
            <button
              onClick={() => { onDelete(location!.id); onClose() }}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={save} disabled={!name.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Add/Edit group modal ───────────────────────────────────────── */
interface GroupLecture { id: string; date: string; title: string; lecturer_name: string; start_time: string; location: string }

function AddGroupModal({
  group, lecturers, topics, locations, onSave, onDelete, onClose,
}: {
  group?: Group
  lecturers: LecturerEntry[]
  topics: Topic[]
  locations: LocationEntry[]
  onSave: (g: Group) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEdit = !!group
  const [name,         setName]         = useState(group?.name         ?? '')
  const [startDate,    setStartDate]    = useState(group?.start_date   ?? '')
  const [endDate,      setEndDate]      = useState(group?.end_date     ?? '')
  const [specialty,    setSpecialty]    = useState(group?.specialty    ?? '')
  const [kurator,      setKurator]      = useState(group?.kurator      ?? '')
  const [studentCount, setStudentCount] = useState(String(group?.student_count ?? ''))
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  // Inline lectures
  const [groupLectures, setGroupLectures] = useState<GroupLecture[]>([])
  const [loadingLec,    setLoadingLec]    = useState(false)
  const [showAddLec,    setShowAddLec]    = useState(false)
  const [newLec, setNewLec] = useState({ date: '', title: '', lecturer_name: '', start_time: '09:00', location: '' })
  const [savingLec, setSavingLec] = useState(false)

  useEffect(() => {
    if (!group?.id) return
    setLoadingLec(true)
    pb.collection('roster_lectures').getFullList({
      filter: `group_name = '${group.name.replace(/'/g, "''")}'`,
      sort: 'date,start_time',
    }).catch(() => []).then(recs => {
      setGroupLectures((recs as { id: string; date: string; title: string; lecturer_name: string; start_time: string; location: string }[])
        .map(r => ({ id: r.id, date: r.date, title: r.title, lecturer_name: r.lecturer_name, start_time: r.start_time, location: r.location })))
      setLoadingLec(false)
    })
  }, [group?.id, group?.name])

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const sc = studentCount !== '' ? Number(studentCount) : null
      if (isEdit) {
        await pb.collection('student_groups').update(group!.id, { name: name.trim(), start_date: startDate || null, end_date: endDate || null, specialty: specialty || null, kurator: kurator || null, student_count: sc })
        onSave({ id: group!.id, name: name.trim(), start_date: startDate, end_date: endDate, specialty, kurator, student_count: sc ?? undefined })
      } else {
        const rec = await pb.collection('student_groups').create({ name: name.trim(), start_date: startDate || null, end_date: endDate || null, specialty: specialty || null, kurator: kurator || null, student_count: sc })
        onSave({ id: rec.id, name: rec.name as string, start_date: (rec.start_date as string) || '', end_date: (rec.end_date as string) || '', specialty: (rec.specialty as string) || '', kurator: (rec.kurator as string) || '', student_count: (rec.student_count as number) || undefined })
      }
      onClose()
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  async function del() {
    if (!group || !onDelete) return
    setDeleting(true)
    await pb.collection('student_groups').delete(group.id)
    onDelete(group.id)
    setDeleting(false)
    onClose()
  }

  async function addLecture() {
    if (!newLec.date || !newLec.title.trim()) return
    setSavingLec(true)
    try {
      const sp = specialtyFor(specialty)
      const rec = await pb.collection('roster_lectures').create({
        date: newLec.date,
        title: newLec.title,
        lecturer_name: newLec.lecturer_name,
        start_time: newLec.start_time,
        location: newLec.location,
        group_name: name.trim(),
        color: sp?.color ?? 'blue',
        notes: '',
      })
      setGroupLectures(prev => [...prev, { id: rec.id, date: newLec.date, title: newLec.title, lecturer_name: newLec.lecturer_name, start_time: newLec.start_time, location: newLec.location }]
        .sort((a, b) => a.date.localeCompare(b.date)))
      setNewLec({ date: '', title: '', lecturer_name: '', start_time: '09:00', location: '' })
      setShowAddLec(false)
    } catch(e) { console.error(e) }
    setSavingLec(false)
  }

  async function deleteLecture(id: string) {
    await pb.collection('roster_lectures').delete(id).catch(() => {})
    setGroupLectures(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать группу' : 'Новая группа'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Название группы"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />

        {/* Куратор */}
        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5">
          <span className="text-xs text-stone-400 shrink-0 w-16">Куратор</span>
          <select
            value={kurator}
            onChange={e => setKurator(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
          >
            <option value="">— не выбран —</option>
            {lecturers.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </div>

        {/* Количество студентов */}
        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5">
          <span className="text-xs text-stone-400 shrink-0 w-16">Студентов</span>
          <input
            type="number"
            min={0}
            value={studentCount}
            onChange={e => setStudentCount(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
          />
        </div>

        {/* Specialty picker */}
        <div className="space-y-1.5">
          <p className="text-xs text-stone-400 px-1">Специальность</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map(s => (
              <button key={s.id} onClick={() => setSpecialty(specialty === s.id ? '' : s.id)}
                className={cn('flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all border',
                  specialty === s.id ? cn(s.bg, s.text, 'border-transparent ring-2 ring-offset-1 ring-stone-300') : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100')}
              >
                <span className={cn('shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md', specialty === s.id ? cn(s.bg, s.text) : 'bg-stone-200 text-stone-500')}>{s.abbr}</span>
                <span className="text-[11px] font-medium leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-xl bg-stone-100 overflow-hidden">
          <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
            <span className="text-xs text-stone-500 w-20 shrink-0">Начало</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none" />
          </div>
          <div className="flex items-center px-4 py-2.5">
            <span className="text-xs text-stone-500 w-20 shrink-0">Конец</span>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none" />
          </div>
        </div>

        {/* Lectures */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 bg-stone-50 border-b border-stone-200">
            <span className="text-xs font-semibold text-stone-600">Лекции группы</span>
            <button onClick={() => setShowAddLec(v => !v)} className="text-stone-400 hover:text-brand-accent"><Plus size={14} /></button>
          </div>

          {/* Add lecture row */}
          {showAddLec && (
            <div className="p-3 space-y-2 border-b border-stone-100 bg-stone-50">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newLec.date} min={startDate || undefined} max={endDate || undefined}
                  onChange={e => setNewLec(v => ({ ...v, date: e.target.value }))}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent" />
                <input type="time" value={newLec.start_time}
                  onChange={e => setNewLec(v => ({ ...v, start_time: e.target.value }))}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent" />
              </div>
              {topics.length > 0 ? (
                <select value={newLec.title} onChange={e => setNewLec(v => ({ ...v, title: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent">
                  <option value="">— Тема —</option>
                  {topics.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                </select>
              ) : (
                <input value={newLec.title} onChange={e => setNewLec(v => ({ ...v, title: e.target.value }))}
                  placeholder="Тема лекции"
                  className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent" />
              )}
              <select value={newLec.lecturer_name} onChange={e => setNewLec(v => ({ ...v, lecturer_name: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent">
                <option value="">— Лектор —</option>
                {lecturers.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
              {locations.length > 0 && (
                <select value={newLec.location} onChange={e => setNewLec(v => ({ ...v, location: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent">
                  <option value="">— Место —</option>
                  {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              )}
              <button onClick={addLecture} disabled={savingLec || !newLec.date || !newLec.title.trim()}
                className="w-full rounded-lg bg-brand-accent py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                {savingLec ? 'Сохранение…' : 'Добавить лекцию'}
              </button>
            </div>
          )}

          {/* Lecture list */}
          {loadingLec ? (
            <p className="px-4 py-3 text-xs text-stone-400">Загрузка…</p>
          ) : groupLectures.length === 0 ? (
            <p className="px-4 py-3 text-xs text-stone-300 italic">Нет лекций</p>
          ) : (
            <div className="divide-y divide-stone-100 max-h-48 overflow-y-auto">
              {groupLectures.map(l => (
                <div key={l.id} className="flex items-start gap-2 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 truncate">{l.title}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(l.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      {l.start_time && ` · ${l.start_time}`}
                      {l.lecturer_name && ` · ${l.lecturer_name}`}
                    </p>
                  </div>
                  <button onClick={() => deleteLecture(l.id)} className="text-stone-300 hover:text-red-400 mt-0.5 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {isEdit && (
            <button onClick={del} disabled={deleting}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-100 disabled:opacity-40">
              {deleting ? '…' : <Trash2 size={15} />}
            </button>
          )}
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать группу'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────── */
type Seg = 'schedule' | 'lectures' | 'lecturers' | 'groups'

export function LectureRosterPage() {
  const [seg,      setSeg]      = useState<Seg>('schedule')
  const [topics,    setTopics]    = useState<Topic[]>([])
  const [lecturers, setLecturers] = useState<LecturerEntry[]>([])
  const [locations, setLocations] = useState<LocationEntry[]>([])
  const [lectures,     setLectures]     = useState<RosterLecture[]>([])
  const [allLectures,  setAllLectures]  = useState<RosterLecture[]>([])
  const [groups,    setGroups]    = useState<Group[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // Calendar state
  const now = new Date()
  const [year,  setYear]     = useState(now.getFullYear())
  const [month, setMonth]    = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())
  const [filterLocation, setFilterLocation] = useState('')
  const [filterSpec,     setFilterSpec]     = useState('')

  // Location modal state
  const [showAddLoc,   setShowAddLoc]   = useState(false)
  const [editLocation, setEditLocation] = useState<LocationEntry | null>(null)

  // Modals
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [editModal,     setEditModal]     = useState<null | { lecture: Partial<RosterLecture> & { date: string; title: string; color: string }; editableDate?: boolean; isLastDay?: boolean }>(null)
  const [topicModal,    setTopicModal]    = useState<null | { topic?: Topic }>(null)
  const [showAddLec,    setShowAddLec]    = useState(false)
  const [editLecturer,  setEditLecturer]  = useState<LecturerEntry | null>(null)
  const [showAddGroup,  setShowAddGroup]  = useState(false)
  const [editGroup,     setEditGroup]     = useState<Group | null>(null)

  // ── Load topics + lecturers + groups
  useEffect(() => {
    Promise.all([
      pb.collection('lecture_topics').getFullList({ sort: 'title' }),
      pb.collection('app_settings').getFullList({ filter: "key='lecturers'" }).catch(() => []),
      pb.collection('app_settings').getFullList({ filter: "key='locations'" }).catch(() => []),
      pb.collection('student_groups').getFullList({ sort: 'start_date' }).catch(() => []),
    ]).then(([tRecs, settRecs, locRecs, gRecs]) => {
      setTopics(tRecs.map(r => ({ id: r.id, title: r.title as string, color: (r.color as string) || 'blue', specialization: (r.specialization as string) || 'air' })))
      try {
        const saved = (settRecs[0] as { value?: string } | undefined)?.value
        if (saved) setLecturers(JSON.parse(saved) as LecturerEntry[])
      } catch { /* ignore */ }
      try {
        const savedLocs = (locRecs[0] as { value?: string } | undefined)?.value
        if (savedLocs) setLocations(JSON.parse(savedLocs) as LocationEntry[])
      } catch { /* ignore */ }
      setGroups(gRecs.map(r => ({
        id: r.id,
        name: r.name as string,
        start_date: (r.start_date as string) || '',
        end_date: (r.end_date as string) || '',
        specialty: (r.specialty as string) || '',
        kurator: (r.kurator as string) || '',
        student_count: (r.student_count as number) || undefined,
      })))
      setLoading(false)
    })
  }, [])

  const mapLecture = (r: Record<string, unknown>): RosterLecture => ({
    id: r.id as string,
    title: (r.title as string) || '',
    lecturer_name: (r.lecturer_name as string) || '',
    group_name: (r.group_name as string) || '',
    location: (r.location as string) || '',
    date: r.date as string,
    start_time: (r.start_time as string) || '',
    color: (r.color as string) || 'blue',
    notes: (r.notes as string) || '',
  })

  // ── Load lectures for current month (used for calendar dots)
  useEffect(() => {
    const firstDay = isoDate(year, month, 1)
    const lastDay  = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    pb.collection('roster_lectures').getFullList({
      filter: `date >= '${firstDay}' && date <= '${lastDay}'`,
      sort: 'date,start_time',
    }).then(recs => setLectures(recs.map(mapLecture)))
  }, [year, month])

  // ── Load ALL lectures once (used for per-group расписание)
  useEffect(() => {
    pb.collection('roster_lectures').getFullList({ sort: 'date,start_time' })
      .then(recs => setAllLectures(recs.map(mapLecture)))
  }, [])

  // ── Persist lecturers to app_settings
  async function persistLecturers(updated: LecturerEntry[]) {
    setSaving(true)
    try {
      const existing = await pb.collection('app_settings').getFullList({ filter: "key='lecturers'" })
      if (existing.length > 0) {
        await pb.collection('app_settings').update(existing[0].id, { value: JSON.stringify(updated) })
      } else {
        await pb.collection('app_settings').create({ key: 'lecturers', value: JSON.stringify(updated) })
      }
    } finally {
      setSaving(false)
    }
  }

  async function addLecturer(l: LecturerEntry) {
    const updated = [...lecturers, l]
    setLecturers(updated)
    await persistLecturers(updated)
  }

  async function updateLecturer(updated: LecturerEntry) {
    const arr = lecturers.map(l => l.id === updated.id ? updated : l)
    setLecturers(arr)
    await persistLecturers(arr)
  }

  async function deleteLecturer(id: string) {
    const updated = lecturers.filter(l => l.id !== id)
    setLecturers(updated)
    await persistLecturers(updated)
  }

  // ── Persist locations to app_settings
  async function persistLocations(updated: LocationEntry[]) {
    try {
      const existing = await pb.collection('app_settings').getFullList({ filter: "key='locations'" })
      if (existing.length > 0) {
        await pb.collection('app_settings').update(existing[0].id, { value: JSON.stringify(updated) })
      } else {
        await pb.collection('app_settings').create({ key: 'locations', value: JSON.stringify(updated) })
      }
    } catch { /* ignore */ }
  }

  async function addLocation(l: LocationEntry) {
    const updated = [...locations, l]
    setLocations(updated)
    await persistLocations(updated)
  }

  async function updateLocation(updated: LocationEntry) {
    const arr = locations.map(l => l.id === updated.id ? updated : l)
    setLocations(arr)
    await persistLocations(arr)
  }

  async function deleteLocation(id: string) {
    const updated = locations.filter(l => l.id !== id)
    setLocations(updated)
    await persistLocations(updated)
  }

  // ── Calendar helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const today       = todayStr()
  const monthLabel  = new Date(year, month, 1)
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const selectedLabel = new Date(selected + 'T00:00:00')
    .toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

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
      .filter(l => {
        if (!filterSpec) return true
        const t = topics.find(tp => tp.title === l.title)
        return t?.specialization === filterSpec
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // ── Drag & drop
  const activeTopic    = activeId?.startsWith('topic::')    ? topics.find(t => `topic::${t.id}` === activeId)         : null
  const activeLecturer = activeId?.startsWith('lecturer::') ? lecturers.find(l => `lecturer::${l.id}` === activeId)   : null
  const activeGroup    = activeId?.startsWith('group::')    ? groups.find(g => `group::${g.id}` === activeId)         : null
  const activeLocation = activeId?.startsWith('location::') ? locations.find(l => `location::${l.id}` === activeId)  : null

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const aData = active.data.current as { type: string; topic?: Topic; lecturer?: LecturerEntry; group?: Group; location?: LocationEntry }
    const oData = over.data.current   as { date: string }
    if (!oData?.date) return

    // Block drops on Sundays
    if (new Date(oData.date + 'T00:00:00').getDay() === 0) return

    const lastDay = isLastDayOfGroup(oData.date)
    if (aData?.type === 'topic' && aData.topic) {
      setSelected(oData.date)
      setEditModal({ lecture: { ...newLectureDefaults(oData.date), title: aData.topic.title, color: aData.topic.color }, isLastDay: lastDay })
    } else if (aData?.type === 'lecturer' && aData.lecturer) {
      setSelected(oData.date)
      setEditModal({ lecture: { ...newLectureDefaults(oData.date), lecturer_name: aData.lecturer.name, color: aData.lecturer.color }, isLastDay: lastDay })
    } else if (aData?.type === 'group' && aData.group) {
      setSelected(oData.date)
      setEditModal({ lecture: { ...newLectureDefaults(oData.date), group_name: aData.group.name }, isLastDay: lastDay })
    } else if (aData?.type === 'location' && aData.location) {
      setSelected(oData.date)
      setEditModal({ lecture: { ...newLectureDefaults(oData.date), location: aData.location.name }, isLastDay: lastDay })
    }
  }

  // ── Save lecture
  async function saveLecture(data: Partial<RosterLecture> & { date: string }) {
    if (!editModal) return
    const existingId = editModal.lecture.id
    if (existingId) {
      await pb.collection('roster_lectures').update(existingId, {
        title: data.title,
        date: data.date,
        lecturer_name: data.lecturer_name,
        group_name: data.group_name,
        location: data.location,
        start_time: data.start_time,
        color: data.color,
        notes: data.notes,
      })
      setLectures(prev => prev.map(l => l.id === existingId ? { ...l, ...data } : l))
      setAllLectures(prev => prev.map(l => l.id === existingId ? { ...l, ...data } : l))
    } else {
      const rec = await pb.collection('roster_lectures').create({
        title: data.title,
        lecturer_name: data.lecturer_name,
        group_name: data.group_name,
        location: data.location,
        date: data.date,
        start_time: data.start_time,
        color: data.color,
        notes: data.notes,
      })
      const newLec = mapLecture(rec as Record<string, unknown>)
      setLectures(prev => [...prev, newLec])
      setAllLectures(prev => [...prev, newLec])
    }
    setEditModal(null)
  }

  // ── Delete lecture
  async function deleteLecture() {
    if (!editModal?.lecture.id) return
    await pb.collection('roster_lectures').delete(editModal.lecture.id)
    setLectures(prev => prev.filter(l => l.id !== editModal!.lecture.id))
    setAllLectures(prev => prev.filter(l => l.id !== editModal!.lecture.id))
    setEditModal(null)
  }

  const selectedLectures = lecturesForDay(selected)

  // Groups filtered by active spec/location filters (for calendar bars)
  const filteredGroups = groups.filter(g => {
    if (filterSpec && g.specialty !== filterSpec) return false
    if (filterLocation) {
      const hasLocLecture = allLectures.some(l => l.group_name === g.name && l.location === filterLocation)
      if (!hasLocLecture) return false
    }
    return true
  })

  // Groups active on a given date (by start/end range), with their specialty dot color
  function defaultGroupName(date: string) {
    const active = groups.filter(g => (!g.start_date || g.start_date <= date) && (!g.end_date || g.end_date >= date))
    return active.length > 0 ? active[0].name : ''
  }

  function isLastDayOfGroup(date: string) {
    return groups.some(g => g.end_date === date)
  }

  function newLectureDefaults(date: string) {
    const lastDay = isLastDayOfGroup(date)
    return {
      date,
      title: lastDay ? ZACHET_TITLE : '',
      color: 'blue',
      start_time: '',
      lecturer_name: '',
      group_name: defaultGroupName(date),
      location: '',
      notes: '',
    }
  }

  if (loading) return (
    <AppShell title="Расписание лекций" showBack>
      <div className="flex justify-center pt-16"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Расписание лекций" showBack>

      {/* Segment tabs */}
      <div className="flex rounded-xl overflow-hidden bg-stone-100 p-1 mb-4">
        {(['schedule', 'lectures', 'lecturers', 'groups'] as Seg[]).map(s => (
          <button
            key={s}
            onClick={() => setSeg(s)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors',
              seg === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500',
            )}
          >
            {s === 'schedule' ? 'График' : s === 'lectures' ? 'Лекции' : s === 'lecturers' ? 'Лекторы' : 'Группы'}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ── */}
      {seg === 'schedule' && (
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex flex-col gap-2">

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
              </div>

              {/* Compact month calendar */}
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

                {/* Week-by-week rows with group bars as overlays */}
                <div className="pb-2">
                  {Array.from({ length: Math.ceil(totalCells / 7) }).map((_, weekIdx) => {
                    const weekFirstCell = weekIdx * 7
                    const monthFirstDate = isoDate(year, month, 1)
                    const monthLastDate  = isoDate(year, month, daysInMonth)

                    // Compute bars for this week
                    const bars = filteredGroups.flatMap((g, gi) => {
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
                      return [{ gi, id: g.id, name: g.name, dot: sp ? sp.dot : 'bg-stone-400',
                        startCol: barStart - weekFirstCell, endCol: barEnd - weekFirstCell,
                        isStart: gStartCell === barStart && (!g.start_date || g.start_date >= monthFirstDate),
                        isEnd:   gEndCell   === barEnd   && (!g.end_date   || g.end_date   <= monthLastDate),
                      }]
                    })

                    return (
                      <div key={weekIdx}>
                        {/* Day cells */}
                        <div className="grid grid-cols-7">
                          {Array.from({ length: 7 }).map((_, col) => {
                            const cellIdx = weekFirstCell + col
                            const dayNum  = cellIdx - firstDow + 1
                            if (dayNum < 1 || dayNum > daysInMonth) return <div key={col} />
                            const dateStr = isoDate(year, month, dayNum)
                            return (
                              <DroppableCell
                                key={col}
                                date={dateStr}
                                isSelected={dateStr === selected}
                                isToday={dateStr === today}
                                dayNum={dayNum}
                                onSelect={() => setSelected(dateStr)}
                              />
                            )
                          })}
                        </div>

                        {/* Group bars — absolutely positioned so they connect edge-to-edge */}
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

              {/* Selected day detail */}
              <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
                  <span className="text-[10px] font-semibold text-stone-600 capitalize truncate">{selectedLabel}</span>
                  {new Date(selected + 'T00:00:00').getDay() !== 0 && (
                    <button
                      onClick={() => setEditModal({ lecture: newLectureDefaults(selected), isLastDay: isLastDayOfGroup(selected) })}
                      className="ml-1 shrink-0 text-brand-accent hover:text-brand-accent/70 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>


                {selectedLectures.length === 0 ? (
                  <p className="px-3 py-3 text-[10px] text-stone-400 italic">Нет лекций на этот день.</p>
                ) : (
                  <div>
                    {selectedLectures.map((lec, i) => {
                      const c = colorFor(lec.color)
                      return (
                        <button
                          key={lec.id}
                          onClick={() => setEditModal({ lecture: lec })}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone-50 transition-colors',
                            i < selectedLectures.length - 1 && 'border-b border-stone-100',
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
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
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Per-group timetables — filtered to groups active on the selected day */}
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
                return (
                  <div key={group.id} className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                    <div className={cn('px-3 py-2 border-b border-stone-200 flex items-center gap-2', sp ? sp.bg : '')}>
                      {sp && <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md', sp.bg, sp.text)}>{sp.abbr}</span>}
                      <span className={cn('text-[10px] font-semibold flex-1', sp ? sp.text : 'text-stone-600')}>{group.name}</span>
                      <button
                        onClick={() => exportTimetableDocx(group, groupLectures)}
                        className={cn('shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors', sp ? sp.text : 'text-stone-500')}
                        title="Скачать DOCX"
                      >
                        <Download size={12} />
                      </button>
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
                            const c = colorFor(lec.color)
                            const d = new Date(lec.date + 'T00:00:00')
                            return (
                              <tr
                                key={lec.id}
                                onClick={() => { setSelected(lec.date); setEditModal({ lecture: lec }) }}
                                className={cn(
                                  'cursor-pointer hover:bg-stone-50 transition-colors',
                                  i < arr.length - 1 && 'border-b border-stone-100',
                                  lec.date === selected && 'bg-brand-accent/5',
                                )}
                              >
                                <td className="px-2 py-1.5 align-top shrink-0">
                                  <div className="flex items-center gap-1">
                                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-px', c.dot)} />
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

          <DragOverlay>
            {activeTopic && (
              <div className="rounded-lg bg-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-800 shadow-lg">
                {activeTopic.title}
              </div>
            )}
            {activeLecturer && (
              <div className={cn('rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-lg', colorFor(activeLecturer.color).bg, colorFor(activeLecturer.color).text)}>
                {activeLecturer.name}
              </div>
            )}
            {activeGroup && (() => {
              const sp = specialtyFor(activeGroup.specialty)
              return (
                <div className={cn('rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-lg flex items-center gap-1.5', sp ? cn(sp.bg, sp.text) : 'bg-brand-accent/10 text-brand-accent')}>
                  {sp && <span className="text-[9px] font-bold">{sp.abbr}</span>}
                  {activeGroup.name}
                </div>
              )
            })()}
            {activeLocation && (
              <div className="rounded-lg bg-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-800 shadow-lg flex items-center gap-1.5">
                <MapPin size={10} className="text-stone-500" />
                {activeLocation.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── LECTURES TAB ── */}
      {seg === 'lectures' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="text-xs font-semibold text-stone-600">
                {topics.length === 0 ? 'Нет лекций' : `${topics.length} лекц${topics.length === 1 ? 'ия' : topics.length < 5 ? 'ии' : 'ий'}`}
              </span>
              <button
                onClick={() => setTopicModal({})}
                className="flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent/70 font-medium transition-colors"
              >
                <Plus size={14} />
                Добавить
              </button>
            </div>

            {topics.length === 0 ? (
              <p className="px-4 py-6 text-xs text-stone-400 italic text-center">
                Нет лекций. Нажмите «Добавить» чтобы создать первую.
              </p>
            ) : (
              <div>
                {SPECIALTIES.map(sp => {
                  const spTopics = topics.filter(t => (t.specialization || 'air') === sp.id)
                  if (spTopics.length === 0) return null
                  return (
                    <div key={sp.id}>
                      <div className={cn('flex items-center gap-2 px-4 py-2 border-b border-stone-200', sp.bg)}>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wide', sp.text)}>{sp.abbr}</span>
                        <span className={cn('text-[10px]', sp.text)}>{sp.label}</span>
                        <span className={cn('ml-auto text-[10px]', sp.text)}>{spTopics.length}</span>
                      </div>
                      {spTopics.map((t, i) => (
                        <button
                          key={t.id}
                          onClick={() => setTopicModal({ topic: t })}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors',
                            i < spTopics.length - 1 && 'border-b border-stone-100',
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full shrink-0', sp.dot)} />
                          <p className="flex-1 text-sm font-medium text-stone-900 line-clamp-2">{t.title}</p>
                        </button>
                      ))}
                      <div className="border-b border-stone-200" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-stone-400 px-1">
            Лекции из этого списка отображаются в зоне перетаскивания на вкладке «Расписание».
          </p>
        </div>
      )}

      {/* ── LECTURERS TAB ── */}
      {seg === 'lecturers' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="text-xs font-semibold text-stone-600">
                Лекторы {saving && <span className="text-stone-300 font-normal ml-1">сохранение…</span>}
              </span>
              <button
                onClick={() => setShowAddLec(true)}
                className="flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent/70 font-medium transition-colors"
              >
                <Plus size={14} />
                Добавить
              </button>
            </div>

            {lecturers.length === 0 ? (
              <p className="px-4 py-6 text-xs text-stone-400 italic text-center">
                Нет лекторов. Нажмите «Добавить» чтобы создать список.
              </p>
            ) : (
              <div>
                {lecturers.map((l, i) => {
                  const c = colorFor(l.color)
                  return (
                    <div
                      key={l.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        i < lecturers.length - 1 && 'border-b border-stone-200',
                      )}
                    >
                      <div className={cn('w-3 h-3 rounded-full shrink-0', c.dot)} />
                      <span className="flex-1 text-sm font-medium text-stone-900">{l.name}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', c.bg, c.text)}>
                        {l.color}
                      </span>
                      <button
                        onClick={() => setEditLecturer(l)}
                        className="text-stone-300 hover:text-stone-500 transition-colors ml-1"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-stone-400 px-1">
            Лекторы доступны при добавлении лекции в расписание.
          </p>
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {seg === 'groups' && (
        <div className="space-y-4">

          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddGroup(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 transition-colors px-3 py-2 rounded-xl"
            >
              <Plus size={13} />
              Новая группа
            </button>
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-stone-400 italic text-center py-8">
              Нет групп. Нажмите «Новая группа» чтобы создать первую.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Render one section per specialty + uncategorized */}
              {[...SPECIALTIES, { id: '', label: 'Без категории', abbr: '—', color: '', bg: 'bg-stone-100', text: 'text-stone-500' }].map(sp => {
                const sectionGroups = groups.filter(g => g.specialty === sp.id)
                if (sectionGroups.length === 0) return null
                return (
                  <div key={sp.id || 'none'}>
                    {/* Section header */}
                    <div className={cn('flex items-center gap-2 px-1 mb-2')}>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sp.bg, sp.text)}>
                        {sp.abbr}
                      </span>
                      <span className="text-xs font-semibold text-stone-600">{sp.label}</span>
                      <span className="text-[10px] text-stone-400">{sectionGroups.length}</span>
                    </div>

                    {/* Squares grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {sectionGroups.map(g => {
                        const startLabel = g.start_date
                          ? new Date(g.start_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                          : null
                        const endLabel = g.end_date
                          ? new Date(g.end_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                          : null
                        const lectureCount = lectures.filter(l => l.date >= (g.start_date || '') && l.date <= (g.end_date || '9999')).length
                        return (
                          <button
                            key={g.id}
                            onClick={() => setEditGroup(g)}
                            className={cn(
                              'rounded-2xl p-3 flex flex-col items-start gap-1.5 text-left active:scale-95 transition-transform',
                              sp.id ? sp.bg : 'bg-stone-100',
                            )}
                          >
                            <span className={cn('text-lg font-black leading-none', sp.id ? sp.text : 'text-stone-600')}>
                              {g.name}
                            </span>
                            {(startLabel || endLabel) && (
                              <span className={cn('text-[9px] font-medium leading-tight opacity-70', sp.id ? sp.text : 'text-stone-500')}>
                                {startLabel}{startLabel && endLabel ? ' – ' : ''}{endLabel}
                              </span>
                            )}
                            {lectureCount > 0 && (
                              <span className="text-[9px] font-semibold bg-white/50 px-1.5 py-0.5 rounded-full text-stone-600">
                                {lectureCount} лекц.
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editModal && (
        <LectureModal
          lecture={editModal.lecture}
          lecturers={lecturers}
          groups={groups.filter(g =>
            (!g.start_date || g.start_date <= editModal.lecture.date) &&
            (!g.end_date   || g.end_date   >= editModal.lecture.date)
          )}
          locations={locations}
          topics={topics}
          isLastDay={editModal.isLastDay ?? isLastDayOfGroup(editModal.lecture.date)}
          editableDate={editModal.editableDate}
          onSave={saveLecture}
          onDelete={editModal.lecture.id ? deleteLecture : undefined}
          onClose={() => setEditModal(null)}
        />
      )}

      {topicModal !== null && (
        <TopicModal
          topic={topicModal.topic}
          onSave={t => setTopics(prev =>
            topicModal.topic
              ? prev.map(x => x.id === t.id ? t : x)
              : [...prev, t]
          )}
          onDelete={id => setTopics(prev => prev.filter(x => x.id !== id))}
          onClose={() => setTopicModal(null)}
        />
      )}

      {showAddLec && (
        <LecturerModal
          onSave={addLecturer}
          onClose={() => setShowAddLec(false)}
        />
      )}

      {editLecturer && (
        <LecturerModal
          lecturer={editLecturer}
          onSave={updateLecturer}
          onDelete={deleteLecturer}
          onClose={() => setEditLecturer(null)}
        />
      )}

      {showAddGroup && (
        <AddGroupModal
          lecturers={lecturers}
          topics={topics}
          locations={locations}
          onSave={g => setGroups(prev => [...prev, g].sort((a, b) => a.start_date.localeCompare(b.start_date)))}
          onClose={() => setShowAddGroup(false)}
        />
      )}

      {editGroup && (
        <AddGroupModal
          group={editGroup}
          lecturers={lecturers}
          topics={topics}
          locations={locations}
          onSave={updated => setGroups(prev =>
            prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.start_date.localeCompare(b.start_date))
          )}
          onDelete={id => setGroups(prev => prev.filter(g => g.id !== id))}
          onClose={() => setEditGroup(null)}
        />
      )}

      {showAddLoc && (
        <LocationModal
          onSave={addLocation}
          onClose={() => setShowAddLoc(false)}
        />
      )}

      {editLocation && (
        <LocationModal
          location={editLocation}
          onSave={updateLocation}
          onDelete={deleteLocation}
          onClose={() => setEditLocation(null)}
        />
      )}
    </AppShell>
  )
}
