import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { AttendanceRow } from '../../components/attendance/AttendanceRow'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAttendance } from '../../hooks/useAttendance'
import { useSessions } from '../../hooks/useSessions'
import { formatDate } from '../../lib/utils'
import type { AttendanceStatus } from '../../types/domain'
import type { Session } from '../../types/domain'
import { Users } from 'lucide-react'

export function MarkAttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { appUser } = useAuth()
  const { records, loading, fetchForSession, upsertAttendance } = useAttendance()
  const { fetchById } = useSessions()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!sessionId) return
    fetchById(sessionId).then(setSession)
    fetchForSession(sessionId)
  }, [sessionId, fetchById, fetchForSession])

  async function handleStatusChange(residentId: string, status: AttendanceStatus) {
    if (!sessionId || !appUser) return
    await upsertAttendance(sessionId, residentId, status, appUser.id)
  }

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length

  return (
    <AppShell
      title={session ? session.title : 'Mark Attendance'}
      showBack
    >
      {session && (
        <p className="mb-4 text-sm text-stone-500">
          {formatDate(session.scheduled_date)}
          {session.location ? ` · ${session.location}` : ''}
        </p>
      )}

      {records.length > 0 && (
        <div className="mb-4 rounded-xl bg-brand-light border border-stone-200 px-4 py-2">
          <p className="text-xs text-stone-500">
            <span className="font-semibold text-emerald-400">{present}</span> / {records.length} residents present
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-16"><Spinner /></div>
      ) : records.length === 0 ? (
        <EmptyState icon={Users} title="No residents found" description="Add residents via the Admin panel first." />
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-4">
          {records.map(r => (
            <AttendanceRow
              key={r.resident_id}
              record={r}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
