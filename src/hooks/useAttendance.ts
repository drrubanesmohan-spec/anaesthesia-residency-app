import { useState, useCallback } from 'react'
import { pb } from '../lib/pbClient'
import type { AttendanceRecord, AttendanceStatus } from '../types/domain'

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchForSession = useCallback(async (sessionId: string) => {
    setLoading(true)
    setError(null)
    try {
      const residents = await pb.collection('users').getFullList({
        filter: `role = 'resident'`,
        sort: 'full_name',
      })

      const existing = await pb.collection('attendance').getFullList({
        filter: `session = '${sessionId}'`,
      })

      const existingMap = new Map(existing.map(r => [r.resident as string, r]))
      const merged = residents.map(r => {
        const ex = existingMap.get(r.id)
        return ex
          ? { ...ex, resident_id: r.id, session_id: sessionId, status: (ex.status as AttendanceStatus) ?? 'absent', resident: { full_name: r.full_name, year: r.year } }
          : {
              session_id: sessionId,
              resident_id: r.id,
              status: 'absent' as AttendanceStatus,
              marked_by: null,
              marked_at: null,
              notes: null,
              resident: { full_name: r.full_name, year: r.year },
            }
      }) as AttendanceRecord[]

      setRecords(merged)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  const fetchForResident = useCallback(async (residentId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await pb.collection('attendance').getFullList({
        filter: `resident = '${residentId}'`,
        sort: '-created',
        expand: 'session',
      })
      setRecords(data.map(r => ({
        ...r,
        resident_id: r.resident as string,
        session_id: r.session as string,
        sessions: r.expand?.session ?? null,
      })) as unknown as AttendanceRecord[])
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  const upsertAttendance = useCallback(async (
    sessionId: string,
    residentId: string,
    status: AttendanceStatus,
    markedBy: string
  ) => {
    setRecords(prev =>
      prev.map(r =>
        r.resident_id === residentId
          ? { ...r, status, marked_by: markedBy, marked_at: new Date().toISOString() }
          : r
      )
    )
    try {
      const existing = await pb.collection('attendance').getFirstListItem(
        `session = '${sessionId}' && resident = '${residentId}'`
      ).catch(() => null)

      const payload = {
        session: sessionId,
        resident: residentId,
        status,
        marked_by: markedBy,
        marked_at: new Date().toISOString(),
      }

      if (existing) {
        await pb.collection('attendance').update(existing.id, payload)
      } else {
        await pb.collection('attendance').create(payload)
      }
    } catch (e) {
      setRecords(prev =>
        prev.map(r =>
          r.resident_id === residentId ? { ...r, status: 'absent', marked_by: null, marked_at: null } : r
        )
      )
      setError((e as Error).message)
    }
  }, [])

  return { records, loading, error, fetchForSession, fetchForResident, upsertAttendance }
}
