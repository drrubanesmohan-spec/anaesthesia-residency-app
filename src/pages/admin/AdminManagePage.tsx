import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
import { useHospitals } from '../../hooks/useHospitals'
import { ResidentAssignments } from '../../components/assignments/ResidentAssignments'
import { SupervisorAssignments } from '../../components/assignments/SupervisorAssignments'
import type { UserRole } from '../../types/auth'
import type { Hospital } from '../../hooks/useHospitals'
import {
  ArrowUpCircle, ArrowDownCircle,
  ChevronDown, ChevronUp, ChevronRight,
  Pencil, Check, X, Plus, Trash2,
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
          <div key={role} className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
            <button
              onClick={() => toggle(role)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', color)}>{label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge)}>{group.length}</span>
              </div>
              {isCollapsed
                ? <ChevronDown size={16} className="text-slate-500" />
                : <ChevronUp size={16} className="text-slate-500" />}
            </button>

            {!isCollapsed && (
              <div className="border-t border-slate-700">
                {group.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500">None</p>
                ) : (
                  group.map((u, i) => (
                    <div
                      key={u.id}
                      className={cn('flex items-center px-4 py-2.5', i !== group.length - 1 && 'border-b border-slate-700/50')}
                    >
                      <span className="text-xs text-slate-500 w-6 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm text-white">{u.full_name}</span>
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
        <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-slate-300 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="text-xs text-slate-500 w-5 shrink-0">{hospital.id}</span>

        {editingName ? (
          <>
            <input
              className="flex-1 bg-slate-700 text-sm text-white rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              autoFocus
            />
            <button onClick={saveName} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
            <button onClick={() => setEditingName(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-white">{hospital.name}</span>
            <span className="text-xs text-slate-600 mr-1">
              {hospital.departments.length} dept{hospital.departments.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => { setEditingName(true); setDraft(hospital.name) }} className="text-slate-500 hover:text-slate-300">
              <Pencil size={13} />
            </button>
            <button onClick={openAddDept} className="text-slate-500 hover:text-emerald-400">
              <Plus size={14} />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="ml-10 border-l border-slate-700 pl-3 pb-1">
          {hospital.departments.length === 0 && !addingDept && (
            <p className="text-xs text-slate-600 py-1">No departments yet</p>
          )}
          {hospital.departments.map(d => (
            <div key={d.id} className="flex items-center gap-2 py-1">
              <span className="text-xs text-slate-400 flex-1">{d.name}</span>
              <button onClick={() => onDeleteDept(d.id, hospital.id)} className="text-slate-600 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {addingDept && (
            <div className="flex items-center gap-2 py-1">
              <input
                ref={deptInputRef}
                className="flex-1 bg-slate-700 text-xs text-white rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Department name"
                value={deptDraft}
                onChange={e => setDeptDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDept(); if (e.key === 'Escape') setAddingDept(false) }}
              />
              <button onClick={saveDept} className="text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
              <button onClick={() => setAddingDept(false)} className="text-slate-500 hover:text-slate-300"><X size={13} /></button>
            </div>
          )}
          {!addingDept && (
            <button onClick={openAddDept} className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 py-1">
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
      <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
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
            <div key={h.id} className={i !== hospitals.length - 1 ? 'border-b border-slate-700/50' : ''}>
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

/* ─── Combined page ──────────────────────────────────────────────── */

type Segment = 'people' | 'hospital'

export function AdminManagePage() {
  const [segment, setSegment] = useState<Segment>('people')

  return (
    <AppShell title="Manage">
      {/* Segmented control */}
      <div className="flex rounded-xl bg-slate-800 p-1 mb-4">
        {(['people', 'hospital'] as Segment[]).map(s => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors',
              segment === s
                ? 'bg-brand-light text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {s === 'people' ? 'People' : 'Hospital'}
          </button>
        ))}
      </div>

      {segment === 'people' ? <PeopleTab /> : <HospitalTab />}
    </AppShell>
  )
}
