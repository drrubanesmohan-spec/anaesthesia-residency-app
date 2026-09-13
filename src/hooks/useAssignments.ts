import { useCallback, useState } from 'react'
import { pb } from '../lib/pbClient'

export interface Assignment {
  id: string
  resident: string
  hospital: string | null
  department: string | null
  assigned_at: string | null
  assigned_by: string | null
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const data = await pb.collection('resident_assignments').getFullList()
    setAssignments(data.map(r => ({
      id: r.id,
      resident: r.resident as string,
      hospital: r.hospital as string | null,
      department: r.department as string | null,
      assigned_at: r.assigned_at as string | null,
      assigned_by: r.assigned_by as string | null,
    })))
    setLoading(false)
  }, [])

  const assignResident = useCallback(async (
    residentId: string,
    hospitalId: string,
    departmentId: string,
    changedById: string,
    current: Assignment | undefined,
  ) => {
    const payload = {
      resident: residentId,
      hospital: hospitalId,
      department: departmentId,
      assigned_by: changedById,
      assigned_at: new Date().toISOString(),
    }

    const existing = current
      ? await pb.collection('resident_assignments').getFirstListItem(
          `resident = '${residentId}'`
        ).catch(() => null)
      : null

    if (existing) {
      await pb.collection('resident_assignments').update(existing.id, payload)
      setAssignments(prev => prev.map(a => a.resident === residentId ? { ...a, ...payload } : a))
    } else {
      const rec = await pb.collection('resident_assignments').create(payload)
      setAssignments(prev => [...prev, { id: rec.id, ...payload }])
    }
  }, [])

  return { assignments, loading, fetchAssignments, assignResident }
}
