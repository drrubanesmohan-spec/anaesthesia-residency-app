import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { DailyAttendance } from '../../components/attendance/DailyAttendance'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'

export function SessionHistoryPage() {
  const { appUser } = useAuth()
  const [supervisorDeptId, setSupervisorDeptId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!appUser) return
    pb.collection('supervisor_assignments').getFirstListItem(
      `supervisor = '${appUser.id}'`
    ).then(data => {
      setSupervisorDeptId(data.department as string ?? null)
    }).catch(() => {
      setSupervisorDeptId(null)
    })
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
