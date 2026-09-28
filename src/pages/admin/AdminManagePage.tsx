import { useEffect, useRef, useState, useCallback } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useHospitals } from '../../hooks/useHospitals'
import { useAuth } from '../../context/AuthContext'
import { ResidentAssignments } from '../../components/assignments/ResidentAssignments'
import { SupervisorAssignments } from '../../components/assignments/SupervisorAssignments'
import type { UserRole } from '../../types/auth'
import type { Hospital } from '../../hooks/useHospitals'
import {
  ArrowUpCircle, ArrowDownCircle,
  ChevronDown, ChevronUp, ChevronRight,
  Pencil, Check, X, Plus, Trash2,
  CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'

/* ─── People tab ─────────────────────────────────────────────────── */

interface Profile { id: string; full_name: string; role: UserRole }

const sections: { role: UserRole; label: string; color: string; badge: string }[] = [
  { role: 'admin',      label: 'Admins',         color: 'text-amber-400',  badge: 'bg-amber-500/20 text-amber-400'  },
  { role: 'supervisor', label: 'Руководители',   color: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  { role: 'resident',   label: 'Ординаторы',     color: 'text-sky-400',    badge: 'bg-sky-500/20 text-sky-400'      },
]

function PeopleTab() {
  const [users, setUsers]         = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [collapsed, setCollapsed] = useState<Record<UserRole, boolean>>({ admin: false, supervisor: false, resident: true })
  const [promoting, setPromoting] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [addingRole, setAddingRole] = useState<UserRole | null>(null)
  const [newName, setNewName]     = useState('')
  const [newEmail, setNewEmail]   = useState('')
  const [newPass, setNewPass]     = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    pb.collection('users').getFullList({ sort: 'full_name' })
      .then(data => {
        setUsers(data.map(r => ({ id: r.id, full_name: r.full_name as string, role: r.role as UserRole })))
        setLoading(false)
      })
  }, [])

  function toggle(role: UserRole) {
    setCollapsed(prev => ({ ...prev, [role]: !prev[role] }))
  }

  async function changeRole(userId: string, newRole: 'admin' | 'supervisor') {
    setPromoting(userId)
    await pb.collection('users').update(userId, { role: newRole })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setPromoting(null)
  }

  async function saveName(userId: string) {
    if (!editName.trim()) return
    await pb.collection('users').update(userId, { full_name: editName.trim() })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, full_name: editName.trim() } : u))
    setEditingId(null)
  }

  async function deleteUser(userId: string) {
    if (!confirm('Delete this user?')) return
    setDeleting(userId)
    try {
      await pb.collection('users').delete(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e) {
      alert((e as Error).message)
    }
    setDeleting(null)
  }

  async function addUser() {
    if (!newName.trim() || !newEmail.trim() || !newPass.trim() || !addingRole) return
    setSaving(true)
    try {
      const rec = await pb.collection('users').create({
        email: newEmail.trim(),
        password: newPass,
        passwordConfirm: newPass,
        full_name: newName.trim(),
        role: addingRole,
        emailVisibility: true,
        temp_password: newPass,
      })
      setUsers(prev => [...prev, { id: rec.id, full_name: rec.full_name as string, role: rec.role as UserRole }]
        .sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setNewName(''); setNewEmail(''); setNewPass(''); setAddingRole(null)
    } catch (e) {
      alert((e as Error).message)
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center pt-12"><Spinner /></div>

  return (
    <div className="space-y-3">
      {sections.map(({ role, label, color, badge }) => {
        const group = users.filter(u => u.role === role)
        const isCollapsed = collapsed[role]
        const isAdding = addingRole === role
        return (
          <div key={role} className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
            {/* Section header */}
            <div className="flex items-center px-4 py-3 hover:bg-stone-50 transition-colors">
              <button onClick={() => toggle(role)} className="flex flex-1 items-center gap-2">
                <span className={cn('text-sm font-semibold', color)}>{label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge)}>{group.length}</span>
              </button>
              <button
                onClick={() => { setAddingRole(isAdding ? null : role); setCollapsed(prev => ({ ...prev, [role]: false })) }}
                className={cn('mr-2 transition-colors', isAdding ? 'text-red-400' : 'text-stone-400 hover:text-brand-accent')}
              >
                {isAdding ? <X size={15} /> : <Plus size={15} />}
              </button>
              <button onClick={() => toggle(role)} className="text-stone-400">
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="border-t border-stone-200">
                {/* Add form */}
                {isAdding && (
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 space-y-2">
                    <input
                      value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                    <input
                      value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email" type="email"
                      className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                    <p className="text-xs text-stone-400">Must be a valid email address</p>
                    <p className="text-xs text-stone-400">Password: minimum 5 characters</p>
                    <input
                      value={newPass} onChange={e => setNewPass(e.target.value)}
                      placeholder="Temporary password" type="password"
                      className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                    <button
                      onClick={addUser} disabled={saving || !newName.trim() || !newEmail.trim() || !newPass.trim()}
                      className="w-full rounded-lg bg-brand-accent py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {saving ? 'Adding…' : `Add ${label.slice(0, -1)}`}
                    </button>
                  </div>
                )}

                {group.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-stone-400">None yet.</p>
                ) : (
                  group.map((u, i) => (
                    <div
                      key={u.id}
                      className={cn('flex items-center px-4 py-2.5 gap-2', i !== group.length - 1 && 'border-b border-stone-200')}
                    >
                      <span className="text-xs text-stone-400 w-6 shrink-0">{i + 1}</span>

                      {editingId === u.id ? (
                        <>
                          <input
                            value={editName} onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveName(u.id); if (e.key === 'Escape') setEditingId(null) }}
                            autoFocus
                            className="flex-1 rounded bg-stone-100 px-2 py-0.5 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
                          />
                          <button onClick={() => saveName(u.id)} className="text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-stone-900">{u.full_name}</span>
                          <button
                            onClick={() => { setEditingId(u.id); setEditName(u.full_name) }}
                            className="text-stone-400 hover:text-brand-accent transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          {role === 'supervisor' && (
                            <button onClick={() => changeRole(u.id, 'admin')} disabled={promoting === u.id}
                              title="Promote to Admin" className="text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors">
                              <ArrowUpCircle size={16} />
                            </button>
                          )}
                          {role === 'admin' && (
                            <button onClick={() => changeRole(u.id, 'supervisor')} disabled={promoting === u.id}
                              title="Demote to Supervisor" className="text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors">
                              <ArrowDownCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
                            className="text-stone-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Hospital tab ───────────────────────────────────────────────── */

function HospitalRow({
  hospital,
  onRename,
  onAddDept,
  onDeleteDept,
}: {
  hospital: Hospital
  onRename: (id: string, name: string) => Promise<void>
  onAddDept: (hospitalId: string, name: string) => Promise<void>
  onDeleteDept: (deptId: string, hospitalId: string) => Promise<void>
}) {
  const [expanded, setExpanded]     = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draft, setDraft]           = useState(hospital.name)
  const [addingDept, setAddingDept] = useState(false)
  const [deptDraft, setDeptDraft]   = useState('')
  const deptInputRef                = useRef<HTMLInputElement>(null)

  async function saveName() {
    if (draft.trim()) await onRename(hospital.id, draft.trim())
    setEditingName(false)
  }

  function openAddDept() {
    setExpanded(true); setAddingDept(true)
    setTimeout(() => deptInputRef.current?.focus(), 50)
  }

  async function saveDept() {
    if (deptDraft.trim()) { await onAddDept(hospital.id, deptDraft.trim()); setDeptDraft('') }
    setAddingDept(false)
  }

  return (
    <div>
      <div className="flex items-center px-4 py-2.5 gap-2">
        <button onClick={() => setExpanded(v => !v)} className="text-stone-400 hover:text-stone-600 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {editingName ? (
          <>
            <input
              className="flex-1 bg-stone-200 text-sm text-stone-900 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              autoFocus
            />
            <button onClick={saveName} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
            <button onClick={() => setEditingName(false)} className="text-stone-400 hover:text-stone-600"><X size={14} /></button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-stone-900">{hospital.name}</span>
            <span className="text-xs text-stone-400 mr-1">
              {hospital.departments.length} dept{hospital.departments.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => { setEditingName(true); setDraft(hospital.name) }} className="text-stone-400 hover:text-stone-600">
              <Pencil size={13} />
            </button>
            <button onClick={openAddDept} className="text-stone-400 hover:text-emerald-400">
              <Plus size={14} />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="ml-10 border-l border-stone-200 pl-3 pb-1">
          {hospital.departments.length === 0 && !addingDept && (
            <p className="text-xs text-stone-400 py-1">No departments yet</p>
          )}
          {hospital.departments.map(d => (
            <div key={d.id} className="flex items-center gap-2 py-1">
              <span className="text-xs text-stone-500 flex-1">{d.name}</span>
              <button onClick={() => onDeleteDept(d.id, hospital.id)} className="text-stone-400 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {addingDept && (
            <div className="flex items-center gap-2 py-1">
              <input
                ref={deptInputRef}
                className="flex-1 bg-stone-200 text-xs text-stone-900 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Department name"
                value={deptDraft}
                onChange={e => setDeptDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDept(); if (e.key === 'Escape') setAddingDept(false) }}
              />
              <button onClick={saveDept} className="text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
              <button onClick={() => setAddingDept(false)} className="text-stone-400 hover:text-stone-600"><X size={13} /></button>
            </div>
          )}
          {!addingDept && (
            <button onClick={openAddDept} className="flex items-center gap-1 text-xs text-stone-400 hover:text-emerald-400 py-1">
              <Plus size={11} /> Add department
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HospitalTab() {
  const { hospitals, loading, fetchHospitals, updateHospital, addDepartment, deleteDepartment } = useHospitals()
  useEffect(() => { fetchHospitals() }, [fetchHospitals])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-400">Hospitals</span>
          {!loading && (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
              {hospitals.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          hospitals.map((h, i) => (
            <div key={h.id} className={i !== hospitals.length - 1 ? 'border-b border-stone-200' : ''}>
              <HospitalRow
                hospital={h}
                onRename={updateHospital}
                onAddDept={addDepartment}
                onDeleteDept={deleteDepartment}
              />
            </div>
          ))
        )}
      </div>

      <SupervisorAssignments />
      <ResidentAssignments />
    </div>
  )
}

/* ─── Attendance god-mode tab ────────────────────────────────────── */

interface Resident { id: string; full_name: string }
interface AttRec { resident_id: string; status: 'present' | 'absent' }

function AttendanceTab() {
  const { appUser } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [residents, setResidents] = useState<Resident[]>([])
  const [records, setRecords] = useState<AttRec[]>([])
  const [loadingRes, setLoadingRes] = useState(true)
  const [loadingAtt, setLoadingAtt] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    pb.collection('users').getFullList({
      filter: "role = 'resident'",
      sort: 'full_name',
    }).then(data => {
      setResidents(data.map(r => ({ id: r.id, full_name: r.full_name as string })))
      setLoadingRes(false)
    })
  }, [])

  const loadAtt = useCallback(async (d: string) => {
    if (residents.length === 0) return
    setLoadingAtt(true)
    const residentIds = new Set(residents.map(r => r.id))
    const att = await pb.collection('daily_attendance').getFullList({
      filter: `date = '${d}'`,
    })
    setRecords(att
      .filter(a => residentIds.has(a.resident as string))
      .map(a => ({ resident_id: a.resident as string, status: a.status as 'present' | 'absent' }))
    )
    setLoadingAtt(false)
  }, [residents])

  useEffect(() => { loadAtt(date) }, [loadAtt, date])

  async function mark(residentId: string, status: 'present' | 'absent' | null) {
    if (!appUser) return
    setSaving(residentId)
    const now = new Date().toISOString()

    if (status === null) {
      const existing = await pb.collection('daily_attendance').getFirstListItem(
        `resident = '${residentId}' && date = '${date}'`
      ).catch(() => null)
      if (existing) await pb.collection('daily_attendance').delete(existing.id)
      setRecords(prev => prev.filter(r => r.resident_id !== residentId))
    } else {
      const existing = await pb.collection('daily_attendance').getFirstListItem(
        `resident = '${residentId}' && date = '${date}'`
      ).catch(() => null)

      const payload = { resident: residentId, date, status, marked_by: appUser.id, marked_at: now }

      if (existing) {
        await pb.collection('daily_attendance').update(existing.id, payload)
      } else {
        await pb.collection('daily_attendance').create(payload)
      }

      try {
        await pb.collection('daily_attendance_logs').create({ resident: residentId, date, status, marked_by: appUser.id, marked_at: now })
      } catch { /* log collection may not exist */ }

      setRecords(prev => {
        const exists = prev.find(r => r.resident_id === residentId)
        return exists
          ? prev.map(r => r.resident_id === residentId ? { ...r, status } : r)
          : [...prev, { resident_id: residentId, status }]
      })
    }
    setSaving(null)
  }

  const filtered = residents.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const present = records.filter(r => r.status === 'present').length
  const absent  = records.filter(r => r.status === 'absent').length
  const unmarked = residents.length - records.length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-stone-200 bg-brand-light px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-stone-200 text-xs text-stone-900 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex gap-3 text-xs ml-auto">
            <span className="text-emerald-400 font-medium">{present}P</span>
            <span className="text-red-400 font-medium">{absent}A</span>
            <span className="text-stone-400">{unmarked} unmarked</span>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search resident…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-stone-200 text-xs text-stone-900 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400"
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
        {loadingRes ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-4 text-xs text-stone-400">No residents found.</p>
        ) : (
          filtered.map((r, i) => {
            const rec = records.find(x => x.resident_id === r.id)
            const isSaving = saving === r.id
            return (
              <div
                key={r.id}
                className={cn(
                  'flex items-center px-4 py-2.5 gap-3',
                  i !== filtered.length - 1 && 'border-b border-stone-200',
                  loadingAtt && 'opacity-50 pointer-events-none'
                )}
              >
                <span className="text-xs text-stone-400 w-6 shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-stone-900 truncate">{r.full_name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => mark(r.id, 'present')}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      rec?.status === 'present'
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500'
                        : 'text-stone-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                    )}
                  >
                    <CheckCircle2 size={13} />P
                  </button>
                  <button
                    onClick={() => mark(r.id, 'absent')}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      rec?.status === 'absent'
                        ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500'
                        : 'text-stone-400 hover:text-red-400 hover:bg-red-500/10'
                    )}
                  >
                    <XCircle size={13} />A
                  </button>
                  {rec && (
                    <button
                      onClick={() => mark(r.id, null)}
                      disabled={isSaving}
                      title="Clear"
                      className="text-stone-400 hover:text-stone-500 transition-colors"
                    >
                      <MinusCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ─── Files tab ──────────────────────────────────────────────────── */

interface UserFile { id: string; full_name: string; email: string; temp_password: string; group: string }

function FilesTab() {
  const [users, setUsers] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      pb.collection('users').getFullList({ filter: "role = 'resident'", sort: 'full_name', expand: 'group' }),
      pb.collection('groups').getFullList(),
    ]).then(([residents, grps]) => {
      const gMap: Record<string, string> = {}
      grps.forEach(g => { gMap[g.id] = g['name'] as string })
      setUsers(residents.map(r => ({
        id: r.id,
        full_name: r.full_name as string,
        email: r.email as string,
        temp_password: (r.temp_password as string) || '—',
        group: gMap[r.group as string] || 'No group',
      })))
      setLoading(false)
    })
  }, [])

  function copyAll() {
    const lines = users.map(u => `${u.full_name}\t${u.email}\t${u.temp_password}`).join('\n')
    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const byGroup = users.reduce<Record<string, UserFile[]>>((acc, u) => {
    if (!acc[u.group]) acc[u.group] = []
    acc[u.group].push(u)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-stone-400">{users.length} residents</span>
        <button
          onClick={copyAll}
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy all'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12"><Spinner /></div>
      ) : (
        Object.entries(byGroup).sort(([a],[b]) => a.localeCompare(b)).map(([groupName, members]) => (
          <div key={groupName} className="rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200">
              <span className="text-xs font-semibold text-stone-600">{groupName}</span>
              <span className="ml-2 text-xs text-stone-400">{members.length} чел.</span>
            </div>
            <div className="divide-y divide-stone-100">
              {members.map((u, i) => (
                <div key={u.id} className="flex items-start px-4 py-2.5 gap-2">
                  <span className="text-xs text-stone-400 w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-stone-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs font-mono bg-stone-100 rounded px-2 py-1 text-stone-700 shrink-0">{u.temp_password}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ─── Settings tab ───────────────────────────────────────────────── */

function SettingsTab() {
  const [token, setToken]         = useState('')
  const [loaded, setLoaded]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [settingId, setSettingId] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('app_settings').getFirstListItem("key = 'yandex_token'")
      .then(rec => { setToken(rec.value as string || ''); setSettingId(rec.id); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  async function save() {
    if (!token.trim()) return
    setSaving(true)
    try {
      if (settingId) {
        await pb.collection('app_settings').update(settingId, { value: token.trim() })
      } else {
        const rec = await pb.collection('app_settings').create({ key: 'yandex_token', value: token.trim() })
        setSettingId(rec.id)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200">
          <p className="text-sm font-semibold text-stone-700">Токен Яндекс.Диска</p>
          <p className="text-xs text-stone-400 mt-0.5">Используется для загрузки документов ординаторов</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {!loaded ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              <textarea
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="y0_AgAAAA..."
                rows={3}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
              />
              <p className="text-xs text-stone-400">
                Получить токен: <strong>id.yandex.ru → OAuth</strong>. Если документы не генерируются — токен истёк, вставьте новый.
              </p>
              <button
                onClick={save}
                disabled={saving || !token.trim()}
                className="w-full rounded-lg bg-brand-accent py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Сохранение…' : saved ? '✓ Сохранено' : 'Сохранить токен'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Combined page ──────────────────────────────────────────────── */

type Segment = 'people' | 'hospital' | 'attendance' | 'files' | 'settings'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'people',     label: 'People'   },
  { key: 'hospital',   label: 'Hospital' },
  { key: 'attendance', label: 'Attend.'  },
  { key: 'files',      label: 'Files'    },
  { key: 'settings',   label: 'Settings' },
]

export function AdminManagePage() {
  const [segment, setSegment] = useState<Segment>('people')

  return (
    <AppShell title="Manage">
      <div className="flex overflow-x-auto rounded-xl bg-stone-100 p-1 mb-4 no-scrollbar">
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={cn(
              'flex-1 min-w-max rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors whitespace-nowrap',
              segment === s.key
                ? 'bg-brand-light text-stone-900 shadow'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === 'people'     && <PeopleTab />}
      {segment === 'hospital'   && <HospitalTab />}
      {segment === 'attendance' && <AttendanceTab />}
      {segment === 'files'      && <FilesTab />}
      {segment === 'settings'   && <SettingsTab />}
    </AppShell>
  )
}
