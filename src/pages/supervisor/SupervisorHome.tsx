import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { supabase } from '../../lib/supabaseClient'

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

    supabase
      .from('supervisor_assignments')
      .select('hospital_id, department_id, hospitals:hospital_id(name), hospital_departments:department_id(name)')
      .eq('supervisor_id', appUser.id)
      .single()
      .then(async ({ data }) => {
        if (!data) return

        const h = data as unknown as { hospitals: { name: string }; hospital_departments: { name: string }; department_id: string }
        setDeptInfo({
          hospital_name: h.hospitals?.name ?? '',
          dept_name: h.hospital_departments?.name ?? '',
        })

        if (!h.department_id) return

        // Fetch residents + attendance in parallel
        const [{ data: residents }, ] = await Promise.all([
          supabase.from('resident_assignments').select('resident_id').eq('department_id', h.department_id),
        ])
        if (!residents || residents.length === 0) return
        const ids = residents.map((r: { resident_id: string }) => r.resident_id)

        const { data: att } = await supabase
          .from('daily_attendance')
          .select('status')
          .eq('date', today)
          .in('resident_id', ids)

        const present = (att ?? []).filter((a: { status: string }) => a.status === 'present').length
        const absent  = (att ?? []).filter((a: { status: string }) => a.status === 'absent').length
        setSummary({ present, absent, total: ids.length })
      })
  }, [appUser, today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title="Home" showLogout>
      <div className="space-y-4">
        {/* Greeting */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">{greeting}</p>
          <p className="text-lg font-semibold text-white">{appUser?.fullName ?? ''}</p>
          {deptInfo ? (
            <p className="text-xs text-emerald-400 mt-1">
              {deptInfo.hospital_name} · {deptInfo.dept_name}
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-1 italic">No department assigned</p>
          )}
        </div>

        {/* Today's attendance summary */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
            Today's Attendance · {today}
          </p>
          {summary ? (
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-emerald-400">{summary.present}</p>
                <p className="text-xs text-slate-500 mt-0.5">Present</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-red-400">{summary.absent}</p>
                <p className="text-xs text-slate-500 mt-0.5">Absent</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-slate-400">{summary.total - summary.present - summary.absent}</p>
                <p className="text-xs text-slate-500 mt-0.5">Unmarked</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">No attendance data yet today.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
