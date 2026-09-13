import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { SessionCard } from '../../components/attendance/SessionCard'
import { SessionFormModal } from '../../components/attendance/SessionFormModal'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSessions } from '../../hooks/useSessions'
import { useHospitals } from '../../hooks/useHospitals'
import { useAuth } from '../../context/AuthContext'
import { ResidentAssignments } from '../../components/assignments/ResidentAssignments'
import { SupervisorAssignments } from '../../components/assignments/SupervisorAssignments'
import type { Session } from '../../types/domain'
import type { Hospital } from '../../hooks/useHospitals'
import { Calendar, Pencil, Check, X, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'

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
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draft, setDraft] = useState(hospital.name)
  const [addingDept, setAddingDept] = useState(false)
  const [deptDraft, setDeptDraft] = useState('')
  const deptInputRef = useRef<HTMLInputElement>(null)

  async function saveName() {
    if (draft.trim()) await onRename(hospital.id, draft.trim())
    setEditingName(false)
  }

  function openAddDept() {
    setExpanded(true)
    setAddingDept(true)
    setTimeout(() => deptInputRef.current?.focus(), 50)
  }

  async function saveDept() {
    if (deptDraft.trim()) {
      await onAddDept(hospital.id, deptDraft.trim())
      setDeptDraft('')
    }
    setAddingDept(false)
  }

  return (
    <div>
      {/* Hospital row */}
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
            <span className="text-xs text-stone-400 mr-1">{hospital.departments.length} dept{hospital.departments.length !== 1 ? 's' : ''}</span>
            <button onClick={() => { setEditingName(true); setDraft(hospital.name) }} className="text-stone-400 hover:text-stone-600">
              <Pencil size={13} />
            </button>
            <button onClick={openAddDept} className="text-stone-400 hover:text-emerald-400">
              <Plus size={14} />
            </button>
          </>
        )}
      </div>

      {/* Departments dropdown */}
      {expanded && (
        <div className="ml-10 border-l border-stone-200 pl-3 pb-1">
          {hospital.departments.length === 0 && !addingDept && (
            <p className="text-xs text-stone-400 py-1">No departments yet</p>
          )}
          {hospital.departments.map(d => (
            <div key={d.id} className="flex items-center gap-2 py-1">
              <span className="text-xs text-stone-500 flex-1">{d.name}</span>
              <button
                onClick={() => onDeleteDept(d.id, hospital.id)}
                className="text-stone-400 hover:text-red-400"
              >
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
            <button
              onClick={openAddDept}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-emerald-400 py-1"
            >
              <Plus size={11} /> Add department
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HospitalsList() {
  const { hospitals, loading, fetchHospitals, updateHospital, addDepartment, deleteDepartment } = useHospitals()

  useEffect(() => { fetchHospitals() }, [fetchHospitals])

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-stone-200">
        <span className="text-sm font-semibold text-emerald-400">Hospitals</span>
        <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
          {hospitals.length}
        </span>
      </div>
      {hospitals.map((h, i) => (
        <div key={h.id} className={i !== hospitals.length - 1 ? 'border-b border-stone-200' : ''}>
          <HospitalRow
            hospital={h}
            onRename={updateHospital}
            onAddDept={addDepartment}
            onDeleteDept={deleteDepartment}
          />
        </div>
      ))}
    </div>
  )
}

export function ManageSessionsPage() {
  const { appUser } = useAuth()
  const { sessions, loading, fetchAll, deleteSession } = useSessions()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)

  useEffect(() => { fetchAll() }, [fetchAll])

  function openEdit(s: Session) { setEditing(s); setModalOpen(true) }

  return (
    <AppShell title="Hospital">
      <HospitalsList />
      <SupervisorAssignments />
      <ResidentAssignments />

      {loading ? (
        <div className="flex justify-center pt-8"><Spinner /></div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Calendar} title="No sessions yet" />
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id}>
              <SessionCard session={s} onClick={() => openEdit(s)} />
              <div className="mt-1.5 flex gap-2 px-1">
                <button onClick={() => openEdit(s)} className="text-xs text-stone-400 hover:text-stone-600">Edit</button>
                <button onClick={() => deleteSession(s.id)} className="text-xs text-red-500 hover:text-red-400">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appUser && (
        <SessionFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={fetchAll}
          session={editing}
          currentUser={appUser}
        />
      )}
    </AppShell>
  )
}
