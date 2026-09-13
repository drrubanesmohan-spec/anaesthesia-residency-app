import { useEffect, useState, useCallback } from 'react'
import { pb } from '../../lib/pbClient'
import { useHospitals } from '../../hooks/useHospitals'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Hospital } from '../../hooks/useHospitals'

interface Supervisor {
  id: string
  full_name: string
}

interface SupervisorAssignment {
  supervisor: string
  hospital: string | null
  department: string | null
}

function SupervisorRow({
  supervisor,
  index,
  hospitals,
  assignments,
  onAssign,
}: {
  supervisor: Supervisor
  index: number
  hospitals: Hospital[]
  assignments: SupervisorAssignment[]
  onAssign: (supervisorId: string, hospitalId: string, deptId: string) => Promise<void>
}) {
  const current = assignments.find(a => a.supervisor === supervisor.id)
  const [selHospital, setSelHospital] = useState<string>(current?.hospital ?? '')
  const [selDept, setSelDept] = useState<string>(current?.department ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelHospital(current?.hospital ?? '')
    setSelDept(current?.department ?? '')
  }, [current?.hospital, current?.department])

  const depts = selHospital
    ? (hospitals.find(h => h.id === selHospital)?.departments ?? [])
    : []

  const currentHospital = hospitals.find(h => h.id === current?.hospital)
  const currentDept = currentHospital?.departments.find(d => d.id === current?.department)

  function handleHospitalChange(val: string) {
    setSelHospital(val)
    setSelDept('')
  }

  async function handleSave() {
    if (!selHospital || !selDept) return
    setSaving(true)
    await onAssign(supervisor.id, selHospital, selDept)
    setSaving(false)
  }

  const isDirty =
    selHospital !== (current?.hospital ?? '') ||
    selDept !== (current?.department ?? '')

  return (
    <div className="px-4 py-3 border-b border-stone-200 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-stone-400 w-6 shrink-0">{index + 1}</span>
        <span className="text-sm text-stone-900 font-medium flex-1">{supervisor.full_name}</span>
        {currentHospital ? (
          <span className="text-xs text-stone-400 truncate max-w-[130px]">
            {currentDept ? `${currentHospital.name} / ${currentDept.name}` : currentHospital.name}
          </span>
        ) : (
          <span className="text-xs text-stone-400 italic">Unassigned</span>
        )}
      </div>
      <div className="ml-6 flex items-center gap-2 flex-wrap">
        <select
          value={selHospital}
          onChange={e => handleHospitalChange(e.target.value)}
          className="flex-1 min-w-[110px] bg-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="">Hospital</option>
          {hospitals.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select
          value={selDept}
          onChange={e => setSelDept(e.target.value)}
          disabled={!selHospital || depts.length === 0}
          className="flex-1 min-w-[110px] bg-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-40"
        >
          <option value="">Department</option>
          {depts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {isDirty && selHospital && selDept && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-stone-900 disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

export function SupervisorAssignments() {
  const { appUser } = useAuth()
  const { hospitals, fetchHospitals } = useHospitals()
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([])
  const [loadingSupervisors, setLoadingSupervisors] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const fetchAssignments = useCallback(async () => {
    const data = await pb.collection('supervisor_assignments').getFullList()
    setAssignments(data.map(r => ({
      supervisor: r.supervisor as string,
      hospital: r.hospital as string | null,
      department: r.department as string | null,
    })))
  }, [])

  useEffect(() => {
    fetchHospitals()
    fetchAssignments()
    pb.collection('users').getFullList({
      filter: "role = 'supervisor'",
      sort: 'full_name',
    }).then(data => {
      setSupervisors(data.map(r => ({ id: r.id, full_name: r.full_name as string })))
      setLoadingSupervisors(false)
    })
  }, [fetchHospitals, fetchAssignments])

  async function handleAssign(supervisorId: string, hospitalId: string, deptId: string) {
    if (!appUser) return
    const existing = await pb.collection('supervisor_assignments').getFirstListItem(
      `supervisor = '${supervisorId}'`
    ).catch(() => null)

    const payload = {
      supervisor: supervisorId,
      hospital: hospitalId,
      department: deptId,
      assigned_by: appUser.id,
      assigned_at: new Date().toISOString(),
    }

    if (existing) {
      await pb.collection('supervisor_assignments').update(existing.id, payload)
    } else {
      await pb.collection('supervisor_assignments').create(payload)
    }

    setAssignments(prev => {
      const exists = prev.find(a => a.supervisor === supervisorId)
      if (exists) return prev.map(a => a.supervisor === supervisorId ? { ...a, hospital: hospitalId, department: deptId } : a)
      return [...prev, { supervisor: supervisorId, hospital: hospitalId, department: deptId }]
    })
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden mb-4">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 border-b border-stone-200 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-purple-400">Supervisor Assignments</span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400">
            {supervisors.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-stone-400" />
          : <ChevronUp size={16} className="text-stone-400" />}
      </button>

      {!collapsed && (
        loadingSupervisors ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : supervisors.length === 0 ? (
          <p className="px-4 py-3 text-xs text-stone-400">No supervisors found</p>
        ) : (
          supervisors.map((s, i) => (
            <SupervisorRow
              key={s.id}
              supervisor={s}
              index={i}
              hospitals={hospitals}
              assignments={assignments}
              onAssign={handleAssign}
            />
          ))
        )
      )}
    </div>
  )
}
