import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useHospitals } from '../../hooks/useHospitals'
import { useAssignments } from '../../hooks/useAssignments'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Hospital } from '../../hooks/useHospitals'
import type { Assignment } from '../../hooks/useAssignments'

interface Resident {
  id: string
  full_name: string
}

function ResidentRow({
  resident,
  index,
  hospitals,
  assignments,
  onAssign,
}: {
  resident: Resident
  index: number
  hospitals: Hospital[]
  assignments: Assignment[]
  onAssign: (residentId: string, hospitalId: number, deptId: string, current: Assignment | undefined) => Promise<void>
}) {
  const current = assignments.find(a => a.resident_id === resident.id)
  const [selHospital, setSelHospital] = useState<number | ''>(current?.hospital_id ?? '')
  const [selDept, setSelDept] = useState<string>(current?.department_id ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelHospital(current?.hospital_id ?? '')
    setSelDept(current?.department_id ?? '')
  }, [current?.hospital_id, current?.department_id])

  const depts = selHospital
    ? (hospitals.find(h => h.id === selHospital)?.departments ?? [])
    : []

  const currentHospital = hospitals.find(h => h.id === current?.hospital_id)
  const currentDept = currentHospital?.departments.find(d => d.id === current?.department_id)

  function handleHospitalChange(val: string) {
    setSelHospital(val ? Number(val) : '')
    setSelDept('')
  }

  async function handleSave() {
    if (!selHospital || !selDept) return
    setSaving(true)
    await onAssign(resident.id, selHospital as number, selDept, current)
    setSaving(false)
  }

  const isDirty =
    String(selHospital) !== String(current?.hospital_id ?? '') ||
    selDept !== (current?.department_id ?? '')

  return (
    <div className="px-4 py-3 border-b border-stone-200 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-stone-400 w-6 shrink-0">{index + 1}</span>
        <span className="text-sm text-stone-900 font-medium flex-1">{resident.full_name}</span>
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
          className="flex-1 min-w-[110px] bg-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
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
          className="flex-1 min-w-[110px] bg-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
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
            className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-stone-900 disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

export function ResidentAssignments() {
  const { appUser } = useAuth()
  const { hospitals, fetchHospitals } = useHospitals()
  const { assignments, fetchAssignments, assignResident } = useAssignments()
  const [allResidents, setAllResidents] = useState<Resident[]>([])
  const [supervisorDeptId, setSupervisorDeptId] = useState<string | null>(null)
  const [loadingResidents, setLoadingResidents] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const isSupervisor = appUser?.role === 'supervisor'

  useEffect(() => {
    fetchHospitals()
    fetchAssignments()

    // If supervisor, fetch their own department assignment first
    if (isSupervisor && appUser) {
      supabase
        .from('supervisor_assignments')
        .select('department_id')
        .eq('supervisor_id', appUser.id)
        .single()
        .then(({ data }) => {
          setSupervisorDeptId(data?.department_id ?? null)
        })
    }

    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'resident')
      .order('full_name')
      .then(({ data }) => {
        setAllResidents((data ?? []) as Resident[])
        setLoadingResidents(false)
      })
  }, [fetchHospitals, fetchAssignments, isSupervisor, appUser])

  // Admins see all residents; supervisors see only those in their department
  const visibleResidents = isSupervisor
    ? allResidents.filter(r =>
        assignments.find(a => a.resident_id === r.id)?.department_id === supervisorDeptId
      )
    : allResidents

  async function handleAssign(
    residentId: string,
    hospitalId: number,
    deptId: string,
    current: Assignment | undefined,
  ) {
    if (!appUser) return
    await assignResident(residentId, hospitalId, deptId, appUser.id, current)
  }

  // Supervisors with no department assigned yet
  if (isSupervisor && !loadingResidents && supervisorDeptId === null) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-stone-200">
          <span className="text-sm font-semibold text-sky-400">Resident Assignments</span>
        </div>
        <p className="px-4 py-3 text-xs text-stone-400">You have not been assigned to a department yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden mb-4">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 border-b border-stone-200 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-sky-400">Resident Assignments</span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400">
            {visibleResidents.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-stone-400" />
          : <ChevronUp size={16} className="text-stone-400" />}
      </button>

      {!collapsed && (
        loadingResidents ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : visibleResidents.length === 0 ? (
          <p className="px-4 py-3 text-xs text-stone-400">
            {isSupervisor ? 'No residents assigned to your department.' : 'No residents found.'}
          </p>
        ) : (
          visibleResidents.map((r, i) => (
            <ResidentRow
              key={r.id}
              resident={r}
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
