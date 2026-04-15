import { useEffect, useRef, useState, useCallback } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
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
  { role: 'admin',      label: 'Admins',      color: 'text-amber-400',  badge: 'bg-amber-500/20 text-amber-400'  },
  { role: 'supervisor', label: 'Supervisors',  color: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  { role: 'resident',   label: 'Residents',   color: 'text-sky-400',    badge: 'bg-sky-500/20 text-sky-400'      },
]

function PeopleTab() {
  const [users, setUsers]       = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState<Record<UserRole, boolean>>({ admin: false, supervisor: false, resident: true })
  const [promoting, setPromoting] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role').order('full_name')
      .then(({ data }) => { setUsers((data ?? []) as Profile[]); setLoading(false) })
  }, [])

  function toggle(role: UserRole) {
    setCollapsed(prev => ({ ...prev, [role]: !prev[role] }))
  }

  async function changeRole(userId: string, newRole: 'admin' | 'supervisor') {
    setPromoting(userId)
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setPromoting(null)
  }

  if (loading) return <div className="flex justify-center pt-12"><Spinner /></div>

  return (
    <div className="space-y-3">
      {sections.map(({ role, label, color, badge }) => {
        const group = users.filter(u => u.role === role)
        const isCollapsed = collapsed[role]
        return (
          <div key={role} className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
            <button
              onClick={() => toggle(role)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', color)}>{label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge)}>{group.length}</span>
              </div>
              {isCollapsed
                ? <ChevronDown size={16} className="text-stone-400" />
                : <ChevronUp size={16} className="text-stone-400" />}
            </button>

            {!isCollapsed && (
              <div className="border-t border-stone-200">
                {group.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-stone-400">None</p>
                ) : (
                  group.map((u, i) => (
                    <div
                      key={u.id}
                      className={cn('flex items-center px-4 py-2.5', i !== group.length - 1 && 'border-b border-stone-200')}
                    >
                      <span className="text-xs text-stone-400 w-6 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-stone-900">{u.full_name}</span>
                      {role === 'supervisor' && (
                        <button
                          onClick={() => changeRole(u.id, 'admin')}
                          disabled={promoting === u.id}
                          title="Promote to Admin"
                          className="ml-2 text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                        >
                          <ArrowUpCircle size={18} />
                        </button>
                      )}
                      {role === 'admin' && (
                        <button
                          onClick={() => changeRole(u.id, 'supervisor')}
                          disabled={promoting === u.id}
                          title="Demote to Supervisor"
                          className="ml-2 text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors"
                        >
                          <ArrowDownCircle size={18} />
                        </button>
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
  onRename: (id: number, name: string) => Promise<void>
  onAddDept: (hospitalId: number, name: string) => Promise<void>
  onDeleteDept: (deptId: string, hospitalId: number) => Promise<void>
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
        <span className="text-xs text-stone-400 w-5 shrink-0">{hospital.id}</span>

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
      {/* Hospitals + departments */}
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

      {/* Supervisor assignments */}
      <SupervisorAssignments />

      {/* Resident assignments */}
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

  // Load all residents once
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'resident').order('full_name')
      .then(({ data }) => { setResidents((data ?? []) as Resident[]); setLoadingRes(false) })
  }, [])

  // Load attendance for selected date
  const loadAtt = useCallback(async (d: string) => {
    if (residents.length === 0) return
    setLoadingAtt(true)
    const { data } = await supabase
      .from('daily_attendance')
      .select('resident_id, status')
      .eq('date', d)
      .in('resident_id', residents.map(r => r.id))
    setRecords((data ?? []) as AttRec[])
    setLoadingAtt(false)
  }, [residents])

  useEffect(() => { loadAtt(date) }, [loadAtt, date])

  async function mark(residentId: string, status: 'present' | 'absent' | null) {
    if (!appUser) return
    setSaving(residentId)
    const now = new Date().toISOString()

    if (status === null) {
      // Clear record
      await supabase.from('daily_attendance').delete()
        .eq('resident_id', residentId).eq('date', date)
      setRecords(prev => prev.filter(r => r.resident_id !== residentId))
    } else {
      await supabase.from('daily_attendance').upsert(
        { resident_id: residentId, date, status, marked_by: appUser.id, marked_at: now },
        { onConflict: 'resident_id,date' }
      )
      await supabase.from('daily_attendance_logs').insert(
        { resident_id: residentId, date, status, marked_by: appUser.id, marked_at: now }
      )
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
      {/* Date + search */}
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

      {/* Resident list */}
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

/* ─── Combined page ──────────────────────────────────────────────── */

type Segment = 'people' | 'hospital' | 'attendance'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'people',     label: 'People'     },
  { key: 'hospital',   label: 'Hospital'   },
  { key: 'attendance', label: 'Attendance' },
]

export function AdminManagePage() {
  const [segment, setSegment] = useState<Segment>('people')

  return (
    <AppShell title="Manage">
      {/* Segmented control */}
      <div className="flex rounded-xl bg-stone-100 p-1 mb-4">
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
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
    </AppShell>
  )
}
