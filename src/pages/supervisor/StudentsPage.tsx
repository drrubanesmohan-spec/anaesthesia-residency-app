import { useEffect, useState, useCallback } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface Group   { id: string; name: string }
interface Student { id: string; full_name: string }
interface Lecture { id: string; topic: string; date: string; group: string; groupName?: string }

/* ─── Attendance sheet ───────────────────────────────────────── */
function AttendanceSheet({ lecture, onClose }: { lecture: Lecture; onClose: () => void }) {
  const [students,   setStudents]   = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({})
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    async function load() {
      const [studentsData, attData] = await Promise.all([
        pb.collection('students').getFullList({ filter: `group = '${lecture.group}'`, sort: 'full_name' }),
        pb.collection('lecture_attendance').getFullList({ filter: `lecture = '${lecture.id}'` }),
      ])
      setStudents(studentsData.map(r => ({ id: r.id, full_name: r.full_name as string })))
      const map: Record<string, 'present' | 'absent'> = {}
      attData.forEach(r => { map[r.student as string] = r.status as 'present' | 'absent' })
      setAttendance(map)
      setLoading(false)
    }
    load()
  }, [lecture])

  function toggle(sid: string) {
    setAttendance(prev => ({ ...prev, [sid]: prev[sid] === 'present' ? 'absent' : 'present' }))
  }

  async function save() {
    setSaving(true)
    for (const s of students) {
      const status = attendance[s.id] ?? 'absent'
      const existing = await pb.collection('lecture_attendance').getFirstListItem(
        `lecture = '${lecture.id}' && student = '${s.id}'`
      ).catch(() => null)
      if (existing) {
        await pb.collection('lecture_attendance').update(existing.id, { status })
      } else {
        await pb.collection('lecture_attendance').create({ lecture: lecture.id, student: s.id, status })
      }
    }
    setSaving(false)
    onClose()
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Spinner />
    </div>
  )

  const present = Object.values(attendance).filter(v => v === 'present').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand">
      <div className="flex items-center justify-between px-4 py-4 bg-brand-dark border-b border-stone-800">
        <div>
          <p className="text-sm font-semibold text-white">{lecture.topic}</p>
          <p className="text-xs text-stone-400 mt-0.5">{lecture.groupName} · {lecture.date}</p>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-4 px-4 py-3 border-b border-stone-200 bg-white">
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-emerald-500">{present}</p>
          <p className="text-xs text-stone-400">Present</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-red-400">{students.length - present}</p>
          <p className="text-xs text-stone-400">Absent</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-stone-500">{students.length}</p>
          <p className="text-xs text-stone-400">Total</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {students.length === 0 && (
          <p className="text-center text-xs text-stone-400 pt-8 italic">No students in this group.</p>
        )}
        {students.map(s => {
          const status = attendance[s.id] ?? 'absent'
          return (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-stone-900">{s.full_name}</p>
              <button
                onClick={() => toggle(s.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                  status === 'present'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 text-stone-500'
                )}
              >
                {status === 'present' ? 'Present' : 'Absent'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-8 pt-3 border-t border-stone-200 bg-white">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>
    </div>
  )
}

/* ─── New lecture modal ──────────────────────────────────────── */
function NewLectureModal({
  supervisorId,
  onClose,
  onSaved,
}: {
  supervisorId: string
  onClose: () => void
  onSaved: (l: Lecture) => void
}) {
  const [groups,  setGroups]  = useState<Group[]>([])
  const [groupId, setGroupId] = useState('')
  const [topic,   setTopic]   = useState('')
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    pb.collection('group_supervisors').getFullList({
      filter: `supervisor = '${supervisorId}'`,
      expand: 'group',
    }).then(data => {
      const gs = data
        .map(r => r.expand?.group as Record<string, unknown> | undefined)
        .filter((g): g is Record<string, unknown> => g !== null && g !== undefined)
      setGroups(gs.map(g => ({ id: g.id as string, name: g.name as string })))
    })
  }, [supervisorId])

  async function submit() {
    if (!groupId || !topic.trim()) { setError('Group and topic are required'); return }
    setSaving(true)
    try {
      const rec = await pb.collection('lectures').create({
        group: groupId,
        supervisor: supervisorId,
        topic: topic.trim(),
        date,
      })
      const groupName = groups.find(g => g.id === groupId)?.name ?? ''
      onSaved({ id: rec.id, topic: rec.topic as string, date: rec.date as string, group: groupId, groupName })
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold text-stone-900">New Lecture</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-stone-100 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
              <span className="text-xs text-stone-500 w-16 shrink-0">Group</span>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} className="flex-1 bg-transparent text-sm text-stone-900 outline-none">
                <option value="">— Select —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex items-center px-4 py-2.5 border-b border-stone-200">
              <span className="text-xs text-stone-500 w-16 shrink-0">Topic</span>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Lecture topic…"
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-stone-500 w-16 shrink-0">Date</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={submit} disabled={saving} className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Lecture'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export function StudentsPage() {
  const { appUser } = useAuth()
  const [lectures,     setLectures]     = useState<Lecture[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [activeSheet,  setActiveSheet]  = useState<Lecture | null>(null)
  const [expanded,     setExpanded]     = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!appUser) return
    const data = await pb.collection('lectures').getFullList({
      filter: `supervisor = '${appUser.id}'`,
      sort: '-date',
      expand: 'group',
    })
    setLectures(data.map(r => {
      const ex = r.expand as Record<string, Record<string, unknown>> | undefined
      return {
        id: r.id,
        topic: r.topic as string,
        date: r.date as string,
        group: r.group as string,
        groupName: ex?.group?.name as string ?? '—',
      }
    }))
    setLoading(false)
  }, [appUser])

  useEffect(() => { load() }, [load])

  async function deleteLecture(id: string) {
    await pb.collection('lectures').delete(id)
    setLectures(prev => prev.filter(l => l.id !== id))
  }

  if (loading) return (
    <AppShell title="Students">
      <div className="flex justify-center pt-12"><Spinner /></div>
    </AppShell>
  )

  return (
    <AppShell title="Students">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Your Lectures</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 rounded-full bg-brand-accent/20 text-brand-accent px-3 py-1 text-xs font-medium hover:bg-brand-accent/30 transition-colors"
        >
          <Plus size={13} />New
        </button>
      </div>

      {lectures.length === 0 && (
        <p className="text-center text-xs text-stone-400 pt-12 italic">No lectures yet. Create one to start taking attendance.</p>
      )}

      <div className="space-y-2">
        {lectures.map(l => {
          const open = expanded === l.id
          return (
            <div key={l.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <div
                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpanded(open ? null : l.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900">{l.topic}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{l.groupName} · {l.date}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-stone-400 mt-0.5 shrink-0" /> : <ChevronDown size={16} className="text-stone-400 mt-0.5 shrink-0" />}
              </div>
              {open && (
                <div className="border-t border-stone-100 px-4 py-3 flex gap-3">
                  <button
                    onClick={() => setActiveSheet(l)}
                    className="flex-1 rounded-xl bg-brand-accent py-2 text-xs font-semibold text-white"
                  >
                    Take Attendance
                  </button>
                  <button
                    onClick={() => deleteLecture(l.id)}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-xs text-red-400 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && appUser && (
        <NewLectureModal
          supervisorId={appUser.id}
          onClose={() => setShowModal(false)}
          onSaved={l => { setLectures(prev => [l, ...prev]); setShowModal(false) }}
        />
      )}

      {activeSheet && (
        <AttendanceSheet
          lecture={activeSheet}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </AppShell>
  )
}
