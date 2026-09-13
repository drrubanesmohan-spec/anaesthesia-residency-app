import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { SessionCard } from '../../components/attendance/SessionCard'
import { DailyAttendance } from '../../components/attendance/DailyAttendance'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSessions } from '../../hooks/useSessions'
import { useHospitals } from '../../hooks/useHospitals'
import { ResidentAssignments } from '../../components/assignments/ResidentAssignments'
import { pb } from '../../lib/pbClient'
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import type { Hospital } from '../../hooks/useHospitals'

function HospitalRow({ hospital }: { hospital: Hospital }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center px-4 py-2.5 gap-2 hover:bg-stone-50 transition-colors"
      >
        <span className="text-stone-400 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="flex-1 text-left text-sm text-stone-900">{hospital.name}</span>
        <span className="text-xs text-stone-400">{hospital.departments.length} dept{hospital.departments.length !== 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="ml-10 border-l border-stone-200 pl-3 pb-2">
          {hospital.departments.length === 0 ? (
            <p className="text-xs text-stone-400 py-1">No departments</p>
          ) : (
            hospital.departments.map(d => (
              <p key={d.id} className="text-xs text-stone-500 py-1">{d.name}</p>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function HospitalsList() {
  const { hospitals, loading, fetchHospitals } = useHospitals()
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
          <HospitalRow hospital={h} />
        </div>
      ))}
    </div>
  )
}

export function SupervisorDashboard() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const { sessions, loading, fetchForSupervisor } = useSessions()
  const [supervisorDeptId, setSupervisorDeptId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (appUser) {
      fetchForSupervisor(appUser.id)
      pb.collection('supervisor_assignments').getFirstListItem(
        `supervisor = '${appUser.id}'`
      ).then(data => {
        setSupervisorDeptId(data.department as string ?? null)
      }).catch(() => {
        setSupervisorDeptId(null)
      })
    }
  }, [appUser, fetchForSupervisor])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sessions.filter(s => !s.is_cancelled && s.scheduled_date >= today)
  const past = sessions.filter(s => s.is_cancelled || s.scheduled_date < today)

  return (
    <AppShell title="Hospital" showLogout>
      <HospitalsList />
      <DailyAttendance supervisorDeptId={supervisorDeptId ?? null} />
      <ResidentAssignments />

      {loading ? (
        <div className="flex justify-center pt-8"><Spinner /></div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Calendar} title="No sessions assigned" description="Hospital sessions assigned to you will appear here." />
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">Upcoming</p>
              <div className="space-y-3">
                {upcoming.map(s => (
                  <SessionCard key={s.id} session={s} onClick={() => navigate(`/supervisor/session/${s.id}/mark`)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">Past</p>
              <div className="space-y-3">
                {past.slice(0, 5).map(s => (
                  <SessionCard key={s.id} session={s} onClick={() => navigate(`/supervisor/session/${s.id}/mark`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
