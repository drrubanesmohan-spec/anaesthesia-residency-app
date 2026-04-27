import { useEffect, useState, useCallback } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
import { cn } from '../../lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Group    { id: string; name: string; start_date: string | null; end_date: string | null }
interface TimetableEntry { id: string; group_id: string; day_of_week: number; subject: string }
interface Student  { id: string; full_name: string; group_id: string | null }
interface Profile  { id: string; full_name: string }
interface GS       { id: string; group_id: string; supervisor_id: string; topic: string | null; supervisor: { full_name: string } }

type Seg = 'groups' | 'students' | 'assign'
const SEGS: { key: Seg; label: string }[] = [
  { key: 'groups',   label: 'Groups'   },
  { key: 'students', label: 'Students' },
  { key: 'assign',   label: 'Assign'   },
]

/* ─── Timetable editor (inside expanded group) ───────────────── */
function TimetableEditor({ groupId }: { groupId: string }) {
  const [entries,  setEntries]  = useState<TimetableEntry[]>([])
  const [dow,      setDow]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('group_timetable').select('*').eq('group_id', groupId).order('day_of_week')
      .then(({ data }) => { setEntries((data ?? []) as TimetableEntry[]); setLoading(false) })
  }, [groupId])

  async function addEntry() {
    if (!subject.trim()) return
    const { data } = await supabase
      .from('group_timetable')
      .insert({ group_id: groupId, day_of_week: dow, subject: subject.trim() })
      .select().single()
    if (data) setEntries(prev => [...prev, data as TimetableEntry].sort((a,b) => a.day_of_week - b.day_of_week))
    setSubject('')
  }

  async function removeEntry(id: string) {
    await supabase.from('group_timetable').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div className="py-2 flex justify-center"><Spinner /></div>

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Timetable</p>
      {entries.map(e => (
        <div key={e.id} className="flex items-center gap-2">
          <span className="text-xs font-medium text-brand-accent w-8 shrink-0">{DAYS[e.day_of_week]}</span>
          <span className="flex-1 text-xs text-stone-700">{e.subject}</span>
          <button onClick={() => removeEntry(e.id)} className="text-stone-300 hover:text-red-400 transition-colors">
            <X size={12} />
          </button>
        </div>
      ))}
      {/* Add new entry */}
      <div className="flex gap-2 pt-1">
        <select
          value={dow}
          onChange={e => setDow(Number(e.target.value))}
          className="rounded-lg bg-stone-100 text-xs text-stone-700 px-2 py-1.5 outline-none w-16 shrink-0"
        >
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Subject…"
          className="flex-1 rounded-lg bg-stone-100 text-xs text-stone-900 placeholder:text-stone-400 px-3 py-1.5 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <button onClick={addEntry} className="rounded-lg bg-brand-accent px-2.5 py-1.5 text-white">
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

/* ─── Groups segment ─────────────────────────────────────────── */
function GroupsSegment() {
  const [groups,   setGroups]   = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [name,     setName]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  // per-group date editing state
  const [dates, setDates] = useState<Record<string, { start: string; end: string }>>({})

  const load = useCallback(async () => {
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('student_groups').select('*').order('name'),
      supabase.from('students').select('id, full_name, group_id'),
    ])
    setGroups((g ?? []) as Group[])
    setStudents((s ?? []) as Student[])
    // init date state from db values
    const d: Record<string, { start: string; end: string }> = {}
    ;(g ?? []).forEach((grp: Group) => {
      d[grp.id] = { start: grp.start_date ?? '', end: grp.end_date ?? '' }
    })
    setDates(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addGroup() {
    if (!name.trim()) return
    const { data } = await supabase.from('student_groups').insert({ name: name.trim() }).select().single()
    if (data) {
      const grp = data as Group
      setGroups(prev => [...prev, grp].sort((a,b) => a.name.localeCompare(b.name)))
      setDates(prev => ({ ...prev, [grp.id]: { start: '', end: '' } }))
    }
    setName('')
  }

  async function deleteGroup(id: string) {
    await supabase.from('student_groups').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  async function saveDates(id: string) {
    const { start, end } = dates[id] ?? {}
    await supabase.from('student_groups').update({
      start_date: start || null,
      end_date: end || null,
    }).eq('id', id)
  }

  if (loading) return <div className="flex justify-center pt-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      {/* Add group */}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGroup()}
          placeholder="New group name…"
          className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-brand-accent"
        />
        <button onClick={addGroup} className="rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} />
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-xs text-stone-400 pt-6 italic">No groups yet.</p>
      )}

      {groups.map(g => {
        const members = students.filter(s => s.group_id === g.id)
        const open = expanded === g.id
        const d = dates[g.id] ?? { start: '', end: '' }
        return (
          <div key={g.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setExpanded(open ? null : g.id)}
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{g.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {members.length} student{members.length !== 1 ? 's' : ''}
                  {d.start ? ` · ${d.start}${d.end && d.end !== d.start ? ` → ${d.end}` : ''}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); deleteGroup(g.id) }}
                  className="text-stone-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                {open ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </div>
            </div>

            {open && (
              <div className="border-t border-stone-100 px-4 py-4 space-y-4">
                {/* Date range */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Date Range</p>
                  <div className="rounded-xl bg-stone-50 overflow-hidden border border-stone-100">
                    <div className="flex items-center px-3 py-2 border-b border-stone-100">
                      <span className="text-xs text-stone-500 w-14 shrink-0">Start</span>
                      <input
                        type="date"
                        value={d.start}
                        onChange={e => setDates(prev => ({ ...prev, [g.id]: { ...prev[g.id], start: e.target.value } }))}
                        className="flex-1 bg-transparent text-xs text-stone-900 outline-none"
                      />
                    </div>
                    <div className="flex items-center px-3 py-2">
                      <span className="text-xs text-stone-500 w-14 shrink-0">End</span>
                      <input
                        type="date"
                        value={d.end}
                        onChange={e => setDates(prev => ({ ...prev, [g.id]: { ...prev[g.id], end: e.target.value } }))}
                        className="flex-1 bg-transparent text-xs text-stone-900 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveDates(g.id)}
                    className="w-full rounded-lg bg-stone-100 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    Save dates
                  </button>
                </div>

                {/* Timetable */}
                <TimetableEditor groupId={g.id} />

                {/* Members */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Members</p>
                  {members.length === 0
                    ? <p className="text-xs text-stone-400 italic">No students assigned.</p>
                    : members.map(s => (
                        <p key={s.id} className="text-xs text-stone-700">{s.full_name}</p>
                      ))
                  }
                </div>
              </div>
            )}
          </div>
        )
      })}
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
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from('students').select('*').order('full_name'),
      supabase.from('student_groups').select('*').order('name'),
    ])
    setStudents((s ?? []) as Student[])
    setGroups((g ?? []) as Group[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addStudent() {
    if (!name.trim()) return
    const { data } = await supabase.from('students').insert({ full_name: name.trim(), group_id: groupId || null }).select().single()
    if (data) setStudents(prev => [...prev, data as Student].sort((a,b) => a.full_name.localeCompare(b.full_name)))
    setName('')
  }

  async function deleteStudent(id: string) {
    await supabase.from('students').delete().eq('id', id)
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  async function changeGroup(id: string, gid: string) {
    await supabase.from('students').update({ group_id: gid || null }).eq('id', id)
    setStudents(prev => prev.map(s => s.id === id ? { ...s, group_id: gid || null } : s))
  }

  if (loading) return <div className="flex justify-center pt-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      {/* Add student */}
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
          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
          >
            <option value="">— None —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={addStudent}
        className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white"
      >
        Add Student
      </button>

      {students.length === 0 && (
        <p className="text-center text-xs text-stone-400 pt-6 italic">No students yet.</p>
      )}

      <div className="space-y-2">
        {students.map(s => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900">{s.full_name}</p>
              <select
                value={s.group_id ?? ''}
                onChange={e => changeGroup(s.id, e.target.value)}
                className="mt-0.5 bg-transparent text-xs text-stone-400 outline-none"
              >
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

/* ─── Assign segment ─────────────────────────────────────────── */
function AssignSegment() {
  const [groups,      setGroups]      = useState<Group[]>([])
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<GS[]>([])
  const [groupId,     setGroupId]     = useState('')
  const [supId,       setSupId]       = useState('')
  const [topic,       setTopic]       = useState('')
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const [{ data: g }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('student_groups').select('*').order('name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'supervisor').order('full_name'),
      supabase.from('group_supervisors').select('*, supervisor:supervisor_id(full_name)'),
    ])
    setGroups((g ?? []) as Group[])
    setSupervisors((p ?? []) as Profile[])
    setAssignments((a ?? []) as unknown as GS[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function assign() {
    if (!groupId || !supId) return
    const { data } = await supabase
      .from('group_supervisors')
      .upsert({ group_id: groupId, supervisor_id: supId, topic: topic || null }, { onConflict: 'group_id,supervisor_id' })
      .select('*, supervisor:supervisor_id(full_name)')
      .single()
    if (data) {
      setAssignments(prev => {
        const filtered = prev.filter(a => !(a.group_id === groupId && a.supervisor_id === supId))
        return [...filtered, data as unknown as GS]
      })
    }
    setGroupId(''); setSupId(''); setTopic('')
  }

  async function remove(id: string) {
    await supabase.from('group_supervisors').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <div className="flex justify-center pt-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-stone-100 overflow-hidden">
        <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
          <span className="text-xs text-stone-500 w-20 shrink-0">Group</span>
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none">
            <option value="">— Select —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
          <span className="text-xs text-stone-500 w-20 shrink-0">Supervisor</span>
          <select value={supId} onChange={e => setSupId(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none">
            <option value="">— Select —</option>
            {supervisors.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="flex items-center px-4 py-2.5">
          <span className="text-xs text-stone-500 w-20 shrink-0">Topic</span>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Optional topic…"
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
          />
        </div>
      </div>
      <button
        onClick={assign}
        disabled={!groupId || !supId}
        className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Assign
      </button>

      {assignments.length === 0 && (
        <p className="text-center text-xs text-stone-400 pt-6 italic">No assignments yet.</p>
      )}

      <div className="space-y-2">
        {assignments.map(a => {
          const grp = groups.find(g => g.id === a.group_id)
          return (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">{(a.supervisor as unknown as { full_name: string }).full_name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{grp?.name ?? '—'}{a.topic ? ` · ${a.topic}` : ''}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-stone-400 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
          )
        })}
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
      {seg === 'assign'   && <AssignSegment />}
    </AppShell>
  )
}
