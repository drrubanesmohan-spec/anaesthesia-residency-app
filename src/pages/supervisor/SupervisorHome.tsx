import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { pb } from '../../lib/pbClient'

interface DeptInfo {
  hospital_name: string
  dept_name: string
}

interface AttendanceSummary {
  present: number
  absent: number
  total: number
}

export function SupervisorHome() {
  const { appUser } = useAuth()
  const [deptInfo, setDeptInfo] = useState<DeptInfo | null>(null)
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!appUser) return

    async function load() {
      if (!appUser) return
      const sa = await pb.collection('supervisor_assignments').getFirstListItem(
        `supervisor = '${appUser.id}'`,
        { expand: 'hospital,department' }
      ).catch(() => null)

      if (!sa) return

      const expanded = sa.expand as Record<string, Record<string, unknown>> | undefined
      setDeptInfo({
        hospital_name: expanded?.hospital?.name as string ?? '',
        dept_name:     expanded?.department?.name as string ?? '',
      })

      const deptId = sa.department as string
      if (!deptId) return

      const residentAssignments = await pb.collection('resident_assignments').getFullList({
        filter: `department = '${deptId}'`,
      })
      const ids = residentAssignments.map(r => r.resident as string)
      if (ids.length === 0) return

      const attRecords = await pb.collection('daily_attendance').getFullList({
        filter: `date = '${today}'`,
      })
      const relevant = attRecords.filter(a => ids.includes(a.resident as string))
      const present = relevant.filter(a => a.status === 'present').length
      const absent  = relevant.filter(a => a.status === 'absent').length
      setSummary({ present, absent, total: ids.length })
    }

    load()
  }, [appUser, today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title="Home" showLogout>
      <div className="space-y-4">
        {/* Greeting */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-5 py-4">
          <p className="text-xs text-stone-400 mb-1">{greeting}</p>
          <p className="text-lg font-semibold text-stone-900">{appUser?.fullName ?? ''}</p>
          {deptInfo ? (
            <p className="text-xs text-emerald-400 mt-1">
              {deptInfo.hospital_name} · {deptInfo.dept_name}
            </p>
          ) : (
            <p className="text-xs text-stone-400 mt-1 italic">No department assigned</p>
          )}
        </div>

        {/* Today's attendance summary */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-3">
            Today's Attendance · {today}
          </p>
          {summary ? (
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-emerald-400">{summary.present}</p>
                <p className="text-xs text-stone-400 mt-0.5">Present</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-red-400">{summary.absent}</p>
                <p className="text-xs text-stone-400 mt-0.5">Absent</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-stone-500">{summary.total - summary.present - summary.absent}</p>
                <p className="text-xs text-stone-400 mt-0.5">Unmarked</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">No attendance data yet today.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
