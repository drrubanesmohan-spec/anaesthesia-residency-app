import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { AttendanceStatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAttendance } from '../../hooks/useAttendance'
import { formatDate } from '../../lib/utils'
import { Calendar } from 'lucide-react'

export function MyAttendancePage() {
  const { appUser } = useAuth()
  const { records, loading, fetchForResident } = useAttendance()

  useEffect(() => {
    if (appUser) fetchForResident(appUser.id)
  }, [appUser, fetchForResident])

  return (
    <AppShell title="My Attendance" showBack>
      {loading ? (
        <div className="flex justify-center pt-16"><Spinner /></div>
      ) : records.length === 0 ? (
        <EmptyState icon={Calendar} title="No attendance records yet" description="Records will appear here once sessions are marked." />
      ) : (
        <div className="space-y-3">
          {records.map((r, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const session = (r as any).sessions
            return (
              <div key={r.id ?? i} className="rounded-2xl border border-stone-200 bg-brand-light p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{session?.title ?? 'Session'}</p>
                    {session?.scheduled_date && (
                      <p className="text-xs text-stone-400 mt-0.5">{formatDate(session.scheduled_date)}</p>
                    )}
                    {session?.location && (
                      <p className="text-xs text-stone-400">{session.location}</p>
                    )}
                  </div>
                  <AttendanceStatusBadge status={r.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
