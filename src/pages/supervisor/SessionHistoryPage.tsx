import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { DailyAttendance } from '../../components/attendance/DailyAttendance'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'

export function SessionHistoryPage() {
  const { appUser } = useAuth()
  const [supervisorDeptId, setSupervisorDeptId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!appUser) return
    supabase
      .from('supervisor_assignments')
      .select('department_id')
      .eq('supervisor_id', appUser.id)
      .single()
      .then(({ data }) => setSupervisorDeptId(data?.department_id ?? null))
  }, [appUser])

  return (
    <AppShell title="Residents">
      {supervisorDeptId === undefined ? (
        <div className="flex justify-center pt-16"><Spinner /></div>
      ) : (
        <DailyAttendance supervisorDeptId={supervisorDeptId} />
      )}
    </AppShell>
  )
}
