import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, User } from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Topic        { id: string; title: string; color: string }
interface LecturerEntry { id: string; name: string; color: string }
interface RosterLecture {
  id: string; title: string; lecturer_name: string; group_name: string
  date: string; start_time: string; color: string; notes: string
}
interface Group {
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
const DOW_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

/* ─── Draggable topic row ────────────────────────────────────────── */
function DraggableTopic({ topic }: { topic: Topic }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `topic::${topic.id}`,
    data: { type: 'topic', topic },
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="cursor-grab active:cursor-grabbing w-full flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1.5 select-none touch-none"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/50 shrink-0" />
      <span className="text-[11px] font-medium text-stone-800 leading-tight line-clamp-2">{topic.title}</span>
    </div>
  )
}

/* ─── Draggable lecturer row ─────────────────────────────────────── */
function DraggableLecturer({ lecturer }: { lecturer: LecturerEntry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lecturer::${lecturer.id}`,
    data: { type: 'lecturer', lecturer },
  })
  const c = colorFor(lecturer.color)
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'cursor-grab active:cursor-grabbing w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 select-none touch-none',
        c.bg,
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      <span className={cn('text-[11px] font-medium leading-tight truncate', c.text)}>{lecturer.name}</span>
    </div>
  )
}

/* ─── Draggable group row ────────────────────────────────────────── */
function DraggableGroup({ group }: { group: Group }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `group::${group.id}`,
    data: { type: 'group', group },
  })
  const sp = specialtyFor(group.specialty)
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'cursor-grab active:cursor-grabbing w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 select-none touch-none',
        sp ? sp.bg : 'bg-brand-accent/10',
      )}
    >
      {sp ? (
        <span className={cn('shrink-0 text-[9px] font-bold px-1 rounded', sp.bg, sp.text)}>{sp.abbr}</span>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
      )}
      <span className={cn('text-[11px] font-medium leading-tight truncate', sp ? sp.text : 'text-brand-accent')}>{group.name}</span>
    </div>
  )
}

/* ─── Droppable calendar cell ────────────────────────────────────── */
function DroppableCell({
  date, lectures, activeGroups, isSelected, isToday, dayNum, onSelect,
}: {
  date: string
  lectures: RosterLecture[]
  activeGroups: Array<{ id: string; dot: string }>
  isSelected: boolean
  isToday: boolean
  dayNum: number
  onSelect: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day::${date}`, data: { date } })

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center py-1 rounded-lg transition-colors cursor-pointer min-h-[48px]',
        isOver
          ? 'bg-brand-accent/15 ring-1 ring-brand-accent'
          : isSelected
          ? 'bg-brand-accent/10 ring-1 ring-brand-accent/40'
          : 'hover:bg-stone-50',
      )}
    >
      <span
        className={cn(
          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
          isSelected
            ? 'bg-brand-accent text-white'
            : isToday
            ? 'ring-1 ring-blue-400 text-blue-400'
            : 'text-stone-700',
        )}
      >
        {dayNum}
      </span>

      {/* Colored bars for active groups */}
      {activeGroups.length > 0 && (
        <div className="w-full flex flex-col gap-[2px] px-1 mt-1">
          {activeGroups.slice(0, 4).map(g => (
            <div key={g.id} className={cn('w-full h-[3px] rounded-full', g.dot)} />
          ))}
        </div>
      )}

      {/* Lecture dots (when no group bars) */}
      {activeGroups.length === 0 && lectures.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[2px] px-0.5 mt-0.5">
          {lectures.slice(0, 2).map(l => (
            <span key={l.id} className={cn('w-1 h-1 rounded-full', colorFor(l.color).dot)} />
          ))}
          {lectures.length > 2 && (
            <span className="text-[7px] leading-none text-stone-400">+{lectures.length - 2}</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Lecture edit/create modal ──────────────────────────────────── */
function LectureModal({
  lecture, lecturers, groups, editableDate, onSave, onDelete, onClose,
}: {
  lecture: Partial<RosterLecture> & { date: string; title: string; color: string }
  lecturers: LecturerEntry[]
  groups: Group[]
  editableDate?: boolean
  onSave: (data: Partial<RosterLecture> & { date: string }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const [title,        setTitle]        = useState(lecture.title)
  const [date,         setDate]         = useState(lecture.date)
  const [time,         setTime]         = useState(lecture.start_time ?? '')
  const [lecturerName, setLecturerName] = useState(lecture.lecturer_name ?? '')
  const [customName,   setCustomName]   = useState('')
  const [groupName,    setGroupName]    = useState(lecture.group_name ?? '')
  const [notes,        setNotes]        = useState(lecture.notes ?? '')
  const [color,        setColor]        = useState(lecture.color)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const isCustom = lecturerName === '__custom__'
  const effectiveName = isCustom ? customName : lecturerName

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true)
    await onSave({ title: title.trim(), date, start_time: time, lecturer_name: effectiveName, group_name: groupName, color, notes })
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

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Тема лекции"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />

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

        {isCustom && (
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="Введите имя лектора"
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          />
        )}

        {groups.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <span className="text-xs text-stone-400 shrink-0">Группа</span>
            <select
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            >
              <option value="">— не выбрана —</option>
              {groups.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
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
            disabled={saving || !title.trim() || !date}
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
  const [title,    setTitle]    = useState(topic?.title ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEdit = !!topic

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    if (isEdit) {
      await pb.collection('lecture_topics').update(topic!.id, { title: title.trim() })
      onSave({ ...topic!, title: title.trim() })
    } else {
      const rec = await pb.collection('lecture_topics').create({ title: title.trim(), color: 'blue' })
      onSave({ id: rec.id, title: rec.title as string, color: (rec.color as string) || 'blue' })
    }
    setSaving(false)
    onClose()
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

/* ─── Add lecturer modal ─────────────────────────────────────────── */
function AddLecturerModal({ onSave, onClose }: { onSave: (l: LecturerEntry) => void; onClose: () => void }) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState('blue')

  function save() {
    if (!name.trim()) return
    onSave({ id: `lec_${Date.now()}`, name: name.trim(), color })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">Новый лектор</span>
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
        <button
          onClick={save} disabled={!name.trim()}
          className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </div>
  )
}

/* ─── Add/Edit group modal ───────────────────────────────────────── */
function AddGroupModal({
  group, onSave, onDelete, onClose,
}: {
  group?: Group
  onSave: (g: Group) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEdit = !!group
  const [name,      setName]      = useState(group?.name      ?? '')
  const [startDate, setStartDate] = useState(group?.start_date ?? '')
  const [endDate,   setEndDate]   = useState(group?.end_date   ?? '')
  const [specialty, setSpecialty] = useState(group?.specialty  ?? '')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    if (isEdit) {
      await pb.collection('student_groups').update(group!.id, {
        name: name.trim(),
        start_date: startDate || null,
        end_date:   endDate   || null,
        specialty:  specialty || null,
      })
      onSave({ id: group!.id, name: name.trim(), start_date: startDate, end_date: endDate, specialty })
    } else {
      const rec = await pb.collection('student_groups').create({
        name: name.trim(),
        start_date: startDate || null,
        end_date:   endDate   || null,
        specialty:  specialty || null,
      })
      onSave({
        id: rec.id,
        name: rec.name as string,
        start_date: (rec.start_date as string) || '',
        end_date:   (rec.end_date   as string) || '',
        specialty:  (rec.specialty  as string) || '',
      })
    }
    setSaving(false)
    onClose()
  }

  async function del() {
    if (!group || !onDelete) return
    setDeleting(true)
    await pb.collection('student_groups').delete(group.id)
    onDelete(group.id)
    setDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{isEdit ? 'Редактировать группу' : 'Новая группа'}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Название группы"
          className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
        />

        {/* Specialty picker */}
        <div className="space-y-1.5">
          <p className="text-xs text-stone-400 px-1">Специальность</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map(s => (
              <button
                key={s.id}
                onClick={() => setSpecialty(specialty === s.id ? '' : s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all border',
                  specialty === s.id
                    ? cn(s.bg, s.text, 'border-transparent ring-2 ring-offset-1 ring-stone-300')
                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100',
                )}
              >
                <span className={cn(
                  'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                  specialty === s.id ? cn(s.bg, s.text) : 'bg-stone-200 text-stone-500',
                )}>
                  {s.abbr}
                </span>
                <span className="text-[11px] font-medium leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-stone-100 overflow-hidden">
          <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
            <span className="text-xs text-stone-500 w-20 shrink-0">Начало</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            />
          </div>
          <div className="flex items-center px-4 py-2.5">
            <span className="text-xs text-stone-500 w-20 shrink-0">Конец</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {isEdit && (
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
            disabled={saving || !name.trim()}
            className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
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
  const [topics,   setTopics]   = useState<Topic[]>([])
  const [lecturers,setLecturers]= useState<LecturerEntry[]>([])
  const [lectures, setLectures] = useState<RosterLecture[]>([])
  const [groups,   setGroups]   = useState<Group[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // Calendar state
  const now = new Date()
  const [year,  setYear]     = useState(now.getFullYear())
  const [month, setMonth]    = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())

  // Modals
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [editModal,     setEditModal]     = useState<null | { lecture: Partial<RosterLecture> & { date: string; title: string; color: string }; editableDate?: boolean }>(null)
  const [topicModal,    setTopicModal]    = useState<null | { topic?: Topic }>(null)
  const [showAddLec,    setShowAddLec]    = useState(false)
  const [showAddGroup,  setShowAddGroup]  = useState(false)
  const [editGroup,     setEditGroup]     = useState<Group | null>(null)

  // ── Load topics + lecturers + groups
  useEffect(() => {
    Promise.all([
      pb.collection('lecture_topics').getFullList({ sort: 'title' }),
      pb.collection('app_settings').getFullList({ filter: "key='lecturers'" }).catch(() => []),
      pb.collection('student_groups').getFullList({ sort: 'start_date' }).catch(() => []),
    ]).then(([tRecs, settRecs, gRecs]) => {
      setTopics(tRecs.map(r => ({ id: r.id, title: r.title as string, color: (r.color as string) || 'blue' })))
      try {
        const saved = (settRecs[0] as { value?: string } | undefined)?.value
        if (saved) setLecturers(JSON.parse(saved) as LecturerEntry[])
      } catch { /* ignore */ }
      setGroups(gRecs.map(r => ({
        id: r.id,
        name: r.name as string,
        start_date: (r.start_date as string) || '',
        end_date: (r.end_date as string) || '',
        specialty: (r.specialty as string) || '',
      })))
      setLoading(false)
    })
  }, [])

  // ── Load lectures for month
  useEffect(() => {
    const firstDay = isoDate(year, month, 1)
    const lastDay  = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    pb.collection('roster_lectures').getFullList({
      filter: `date >= '${firstDay}' && date <= '${lastDay}'`,
      sort: 'date,start_time',
    }).then(recs => {
      setLectures(recs.map(r => ({
        id: r.id,
        title: r.title as string,
        lecturer_name: (r.lecturer_name as string) || '',
        group_name: (r.group_name as string) || '',
        date: r.date as string,
        start_time: (r.start_time as string) || '',
        color: (r.color as string) || 'blue',
        notes: (r.notes as string) || '',
      })))
    })
  }, [year, month])

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

  async function deleteLecturer(id: string) {
    const updated = lecturers.filter(l => l.id !== id)
    setLecturers(updated)
    await persistLecturers(updated)
  }

  // ── Calendar helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()
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
    return lectures.filter(l => l.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // ── Drag & drop
  const activeTopic    = activeId?.startsWith('topic::')    ? topics.find(t => `topic::${t.id}` === activeId)       : null
  const activeLecturer = activeId?.startsWith('lecturer::') ? lecturers.find(l => `lecturer::${l.id}` === activeId) : null
  const activeGroup    = activeId?.startsWith('group::')    ? groups.find(g => `group::${g.id}` === activeId)       : null

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const aData = active.data.current as { type: string; topic?: Topic; lecturer?: LecturerEntry; group?: Group }
    const oData = over.data.current   as { date: string }
    if (!oData?.date) return

    if (aData?.type === 'topic' && aData.topic) {
      setSelected(oData.date)
      setEditModal({
        lecture: { title: aData.topic.title, date: oData.date, color: aData.topic.color, start_time: '', lecturer_name: '', group_name: '', notes: '' },
      })
    } else if (aData?.type === 'lecturer' && aData.lecturer) {
      setSelected(oData.date)
      setEditModal({
        lecture: { title: '', date: oData.date, color: aData.lecturer.color, start_time: '', lecturer_name: aData.lecturer.name, group_name: '', notes: '' },
      })
    } else if (aData?.type === 'group' && aData.group) {
      setSelected(oData.date)
      setEditModal({
        lecture: { title: '', date: oData.date, color: 'blue', start_time: '', lecturer_name: '', group_name: aData.group.name, notes: '' },
      })
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
        start_time: data.start_time,
        color: data.color,
        notes: data.notes,
      })
      setLectures(prev => prev.map(l => l.id === existingId ? { ...l, ...data } : l))
    } else {
      const rec = await pb.collection('roster_lectures').create({
        title: data.title,
        lecturer_name: data.lecturer_name,
        group_name: data.group_name,
        date: data.date,
        start_time: data.start_time,
        color: data.color,
        notes: data.notes,
      })
      setLectures(prev => [...prev, {
        id: rec.id,
        title: rec.title as string,
        lecturer_name: (rec.lecturer_name as string) || '',
        group_name: (rec.group_name as string) || '',
        date: rec.date as string,
        start_time: (rec.start_time as string) || '',
        color: (rec.color as string) || 'blue',
        notes: (rec.notes as string) || '',
      }])
    }
    setEditModal(null)
  }

  // ── Delete lecture
  async function deleteLecture() {
    if (!editModal?.lecture.id) return
    await pb.collection('roster_lectures').delete(editModal.lecture.id)
    setLectures(prev => prev.filter(l => l.id !== editModal!.lecture.id))
    setEditModal(null)
  }

  const selectedLectures = lecturesForDay(selected)

  // Groups active on a given date (by start/end range), with their specialty dot color
  function activeGroupsForDay(date: string) {
    return groups
      .filter(g => (!g.start_date || g.start_date <= date) && (!g.end_date || g.end_date >= date))
      .map(g => {
        const sp = specialtyFor(g.specialty)
        return { id: g.id, dot: sp ? sp.dot : 'bg-stone-300' }
      })
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
          <div className="flex gap-2">

            {/* LEFT: Topics + Lecturers */}
            <div className="w-[38%] shrink-0 flex flex-col gap-2">

              {/* Topics */}
              <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-stone-200">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Лекции</span>
                  <button onClick={() => setTopicModal({})} className="text-stone-400 hover:text-brand-accent transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 p-2 max-h-52 overflow-y-auto no-scrollbar">
                  {topics.length === 0 ? (
                    <p className="text-[10px] text-stone-300 italic py-1">Нет лекций</p>
                  ) : (
                    topics.map(t => <DraggableTopic key={t.id} topic={t} />)
                  )}
                </div>
              </div>

              {/* Lecturers */}
              <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-stone-200">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Лекторы</span>
                  <button onClick={() => setShowAddLec(true)} className="text-stone-400 hover:text-brand-accent transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 p-2 max-h-36 overflow-y-auto no-scrollbar">
                  {lecturers.length === 0 ? (
                    <p className="text-[10px] text-stone-300 italic py-1">Нет лекторов</p>
                  ) : (
                    lecturers.map(l => <DraggableLecturer key={l.id} lecturer={l} />)
                  )}
                </div>
              </div>

              {/* Groups */}
              <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-stone-200">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Группы</span>
                  <button onClick={() => setShowAddGroup(true)} className="text-stone-400 hover:text-brand-accent transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 p-2 max-h-36 overflow-y-auto no-scrollbar">
                  {groups.length === 0 ? (
                    <p className="text-[10px] text-stone-300 italic py-1">Нет групп</p>
                  ) : (
                    groups.map(g => <DraggableGroup key={g.id} group={g} />)
                  )}
                </div>
              </div>

              <p className="text-[9px] text-stone-300 text-center leading-tight">
                Перетащите на день →
              </p>
            </div>

            {/* RIGHT: Calendar + day detail */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">

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

                <div className="grid grid-cols-7 px-1 pt-2 pb-0.5">
                  {DOW_RU.map((d, i) => (
                    <div key={i} className="flex justify-center">
                      <span className="text-[8px] font-medium text-stone-400">{d}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 px-1 pb-2 gap-y-0.5">
                  {Array.from({ length: totalCells }).map((_, idx) => {
                    const dayNum = idx - firstDow + 1
                    if (dayNum < 1 || dayNum > daysInMonth) {
                      return <div key={idx} className="min-h-[40px]" />
                    }
                    const dateStr = isoDate(year, month, dayNum)
                    return (
                      <DroppableCell
                        key={idx}
                        date={dateStr}
                        lectures={lecturesForDay(dateStr)}
                        activeGroups={activeGroupsForDay(dateStr)}
                        isSelected={dateStr === selected}
                        isToday={dateStr === today}
                        dayNum={dayNum}
                        onSelect={() => setSelected(dateStr)}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Selected day detail */}
              <div className="rounded-xl border border-stone-200 bg-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
                  <span className="text-[10px] font-semibold text-stone-600 capitalize truncate">{selectedLabel}</span>
                  <button
                    onClick={() => setEditModal({
                      lecture: { date: selected, title: '', color: 'blue', start_time: '', lecturer_name: '', notes: '' },
                    })}
                    className="ml-1 shrink-0 text-brand-accent hover:text-brand-accent/70 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
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
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
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
                {topics.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setTopicModal({ topic: t })}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors',
                      i < topics.length - 1 && 'border-b border-stone-200',
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-stone-400">{i + 1}</span>
                    </div>
                    <p className="flex-1 text-sm font-medium text-stone-900 truncate">{t.title}</p>
                  </button>
                ))}
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
                        onClick={() => deleteLecturer(l.id)}
                        className="text-stone-300 hover:text-red-400 transition-colors ml-1"
                      >
                        <Trash2 size={14} />
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
          groups={groups}
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
        <AddLecturerModal
          onSave={addLecturer}
          onClose={() => setShowAddLec(false)}
        />
      )}

      {showAddGroup && (
        <AddGroupModal
          onSave={g => setGroups(prev => [...prev, g].sort((a, b) => a.start_date.localeCompare(b.start_date)))}
          onClose={() => setShowAddGroup(false)}
        />
      )}

      {editGroup && (
        <AddGroupModal
          group={editGroup}
          onSave={updated => setGroups(prev =>
            prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.start_date.localeCompare(b.start_date))
          )}
          onDelete={id => setGroups(prev => prev.filter(g => g.id !== id))}
          onClose={() => setEditGroup(null)}
        />
      )}
    </AppShell>
  )
}
