import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Trash2, Pencil } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Group   { id: string; name: string; start_date: string | null; end_date: string | null }
interface TTEntry { id: string; group: string; day_of_week: number; subject: string; supervisor: string | null; supervisorName?: string | null }
interface Student { id: string; full_name: string; group: string | null }
interface Profile { id: string; full_name: string }

type Seg = 'groups' | 'students'
const SEGS: { key: Seg; label: string }[] = [
  { key: 'groups',   label: 'Groups'   },
  { key: 'students', label: 'Students' },
]

/* ─── Group edit modal ───────────────────────────────────────── */
function GroupEditModal({
  group,
  supervisors,
  onClose,
  onSaved,
}: {
  group: Group
  supervisors: Profile[]
  onClose: () => void
  onSaved: (g: Group) => void
}) {
  const [name,      setName]      = useState(group.name)
  const [startDate, setStartDate] = useState(group.start_date ?? '')
  const [endDate,   setEndDate]   = useState(group.end_date ?? '')
  const [entries,   setEntries]   = useState<TTEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  const [dow,     setDow]     = useState(1)
  const [subject, setSubject] = useState('')
  const [supId,   setSupId]   = useState('')

  useEffect(() => {
    pb.collection('group_timetable').getFullList({
      filter: `group = '${group.id}'`,
      sort: 'day_of_week',
      expand: 'supervisor',
    }).then(data => {
      setEntries(data.map(r => {
        const ex = r.expand as Record<string, Record<string, unknown>> | undefined
        return {
          id: r.id,
          group: r.group as string,
          day_of_week: r.day_of_week as number,
          subject: r.subject as string,
          supervisor: r.supervisor as string | null,
          supervisorName: ex?.supervisor ? ex.supervisor.full_name as string : null,
        }
      }))
      setLoading(false)
    })
  }, [group.id])

  async function saveGroup() {
    setSaving(true)
    const rec = await pb.collection('student_groups').update(group.id, {
      name: name.trim() || group.name,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    setSaving(false)
    onSaved({ id: rec.id, name: rec.name as string, start_date: rec.start_date as string | null, end_date: rec.end_date as string | null })
  }

  async function addEntry() {
    if (!subject.trim()) return
    const rec = await pb.collection('group_timetable').create({
      group: group.id,
      day_of_week: dow,
      subject: subject.trim(),
      supervisor: supId || null,
    })
    const sup = supervisors.find(s => s.id === supId)
    setEntries(prev => [...prev, {
      id: rec.id,
      group: group.id,
      day_of_week: rec.day_of_week as number,
      subject: rec.subject as string,
      supervisor: rec.supervisor as string | null,
      supervisorName: sup?.full_name ?? null,
    }].sort((a, b) => a.day_of_week - b.day_of_week))
    setSubject('')
    setSupId('')
  }

  async function updateEntrySupervisor(id: string, sid: string) {
    await pb.collection('group_timetable').update(id, { supervisor: sid || null })
    const sup = supervisors.find(s => s.id === sid)
    setEntries(prev => prev.map(e => e.id === id
      ? { ...e, supervisor: sid || null, supervisorName: sup?.full_name ?? null }
      : e
    ))
  }

  async function removeEntry(id: string) {
    await pb.collection('group_timetable').delete(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand">
      <div className="flex items-center justify-between px-4 py-4 bg-brand-dark border-b border-stone-800">
        <p className="text-sm font-semibold text-white">Edit Group</p>
        <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Group Name</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl bg-white border border-stone-200 px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Date Range</p>
          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-stone-100">
              <span className="text-xs text-stone-500 w-14 shrink-0">Start</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none" />
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-stone-500 w-14 shrink-0">End</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Timetable</p>

          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <div key={e.id} className="rounded-xl bg-white border border-stone-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-brand-accent w-8 shrink-0">{DAYS[e.day_of_week]}</span>
                    <span className="flex-1 text-sm font-medium text-stone-900">{e.subject}</span>
                    <button onClick={() => removeEntry(e.id)} className="text-stone-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-10">
                    <span className="text-xs text-stone-400 shrink-0">Supervisor</span>
                    <select
                      value={e.supervisor ?? ''}
                      onChange={ev => updateEntrySupervisor(e.id, ev.target.value)}
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 px-2 py-1 outline-none"
                    >
                      <option value="">— None —</option>
                      {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                  {e.supervisorName && (
                    <p className="text-[10px] text-stone-400 mt-1 pl-10">{e.supervisorName}</p>
                  )}
                </div>
              ))}

              <div className="rounded-xl bg-stone-50 border border-stone-200 overflow-hidden">
                <div className="flex items-center px-3 py-2 border-b border-stone-100">
                  <span className="text-xs text-stone-400 w-16 shrink-0">Day</span>
                  <select value={dow} onChange={e => setDow(Number(e.target.value))}
                    className="flex-1 bg-transparent text-xs text-stone-900 outline-none">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="flex items-center px-3 py-2 border-b border-stone-100">
                  <span className="text-xs text-stone-400 w-16 shrink-0">Subject</span>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEntry()}
                    placeholder="Topic name…"
                    className="flex-1 bg-transparent text-xs text-stone-900 placeholder:text-stone-400 outline-none"
                  />
                </div>
                <div className="flex items-center px-3 py-2">
                  <span className="text-xs text-stone-400 w-16 shrink-0">Supervisor</span>
                  <select value={supId} onChange={e => setSupId(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-stone-900 outline-none">
                    <option value="">— None —</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addEntry} disabled={!subject.trim()}
                className="w-full rounded-xl bg-stone-100 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-1">
                <Plus size={13} /> Add to timetable
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8 pt-3 border-t border-stone-200 bg-white">
        <button
          onClick={saveGroup}
          disabled={saving}
          className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Group'}
        </button>
      </div>
    </div>
  )
}

/* ─── Groups segment ─────────────────────────────────────────── */
function GroupsSegment() {
  const [groups,      setGroups]      = useState<Group[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [name,        setName]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState<Group | null>(null)

  const load = useCallback(async () => {
    const [gData, sData, pData] = await Promise.all([
      pb.collection('student_groups').getFullList({ sort: 'name' }),
      pb.collection('students').getFullList(),
      pb.collection('users').getFullList({ filter: "role = 'supervisor' || role = 'admin'", sort: 'full_name' }),
    ])
    setGroups(gData.map(r => ({ id: r.id, name: r.name as string, start_date: r.start_date as string | null, end_date: r.end_date as string | null })))
    setStudents(sData.map(r => ({ id: r.id, full_name: r.full_name as string, group: r.group as string | null })))
    setSupervisors(pData.map(r => ({ id: r.id, full_name: r.full_name as string })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addGroup() {
    if (!name.trim()) return
    try {
      const rec = await pb.collection('student_groups').create({ name: name.trim() })
      setGroups(prev => [...prev, { id: rec.id, name: rec.name as string, start_date: null, end_date: null }].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (e) {
      alert((e as Error).message)
    }
    setName('')
  }

  async function deleteGroup(id: string) {
    await pb.collection('student_groups').delete(id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <div className="flex justify-center pt-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGroup()}
          placeholder="New group name…"
          className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <button onClick={addGroup} className="rounded-xl bg-brand-accent px-4 py-2.5 text-white">
          <Plus size={16} />
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-xs text-stone-400 pt-6 italic">No groups yet.</p>
      )}

      {groups.map(g => {
        const members = students.filter(s => s.group === g.id)
        return (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900">{g.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {members.length} student{members.length !== 1 ? 's' : ''}
                {g.start_date ? ` · ${g.start_date}${g.end_date && g.end_date !== g.start_date ? ` → ${g.end_date}` : ''}` : ''}
              </p>
            </div>
            <button
              onClick={() => setEditing(g)}
              className="text-stone-400 hover:text-brand-accent transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => deleteGroup(g.id)}
              className="text-stone-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}

      {editing && (
        <GroupEditModal
          group={editing}
          supervisors={supervisors}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setGroups(prev => prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.name.localeCompare(b.name)))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/* ─── Students segment ───────────────────────────────────────── */
function StudentsSegment() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups,   setGroups]   = useState<Group[]>([])
  const [name,     setName]     = useState('')
  const [groupId,  setGroupId]  = useState('')
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    const [sData, gData] = await Promise.all([
      pb.collection('students').getFullList({ sort: 'full_name' }),
      pb.collection('student_groups').getFullList({ sort: 'name' }),
    ])
    setStudents(sData.map(r => ({ id: r.id, full_name: r.full_name as string, group: r.group as string | null })))
    setGroups(gData.map(r => ({ id: r.id, name: r.name as string, start_date: r.start_date as string | null, end_date: r.end_date as string | null })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addStudent() {
    if (!name.trim()) return
    const rec = await pb.collection('students').create({ full_name: name.trim(), group: groupId || null })
    setStudents(prev => [...prev, { id: rec.id, full_name: rec.full_name as string, group: rec.group as string | null }].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setName('')
  }

  async function deleteStudent(id: string) {
    await pb.collection('students').delete(id)
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  async function changeGroup(id: string, gid: string) {
    await pb.collection('students').update(id, { group: gid || null })
    setStudents(prev => prev.map(s => s.id === id ? { ...s, group: gid || null } : s))
  }

  if (loading) return <div className="flex justify-center pt-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-stone-100 overflow-hidden">
        <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
          <span className="text-xs text-stone-500 w-16 shrink-0">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStudent()}
            placeholder="Student name…"
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
          />
        </div>
        <div className="flex items-center px-4 py-2.5">
          <span className="text-xs text-stone-500 w-16 shrink-0">Group</span>
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none">
            <option value="">— None —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      <button onClick={addStudent} className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white">
        Add Student
      </button>

      {students.length === 0 && <p className="text-center text-xs text-stone-400 pt-6 italic">No students yet.</p>}

      <div className="space-y-2">
        {students.map(s => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900">{s.full_name}</p>
              <select value={s.group ?? ''} onChange={e => changeGroup(s.id, e.target.value)}
                className="mt-0.5 bg-transparent text-xs text-stone-400 outline-none">
                <option value="">No group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <button onClick={() => deleteStudent(s.id)} className="text-stone-400 hover:text-red-400 transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export function StudentsAdminPage() {
  const [seg, setSeg] = useState<Seg>('groups')

  return (
    <AppShell title="Students">
      <div className="flex rounded-xl bg-stone-100 p-1 mb-4">
        {SEGS.map(s => (
          <button
            key={s.key}
            onClick={() => setSeg(s.key)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              seg === s.key ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {seg === 'groups'   && <GroupsSegment />}
      {seg === 'students' && <StudentsSegment />}
    </AppShell>
  )
}
