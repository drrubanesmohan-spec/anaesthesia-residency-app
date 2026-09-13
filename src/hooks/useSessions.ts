import { useState, useCallback } from 'react'
import { pb } from '../lib/pbClient'
import type { Session } from '../types/domain'

function mapRecord(r: Record<string, unknown>): Session {
  return {
    ...r,
    id: r.id as string,
    supervisor_id: r.supervisor as string,
    supervisor: r.expand ? (r.expand as Record<string, unknown>).supervisor : null,
  } as unknown as Session
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await pb.collection('sessions').getFullList({
        sort: '-scheduled_date',
        expand: 'supervisor',
      })
      setSessions(data.map(mapRecord))
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  const fetchForSupervisor = useCallback(async (supervisorId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await pb.collection('sessions').getFullList({
        filter: `supervisor = '${supervisorId}'`,
        sort: '-scheduled_date',
        expand: 'supervisor',
      })
      setSessions(data.map(mapRecord))
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  const fetchById = useCallback(async (id: string): Promise<Session | null> => {
    try {
      const r = await pb.collection('sessions').getOne(id, { expand: 'supervisor' })
      return mapRecord(r as unknown as Record<string, unknown>)
    } catch {
      return null
    }
  }, [])

  const createSession = useCallback(async (payload: Omit<Session, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await pb.collection('sessions').create({
        ...payload,
        supervisor: (payload as unknown as Record<string, unknown>).supervisor_id,
      })
      await fetchAll()
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, [fetchAll])

  const updateSession = useCallback(async (id: string, payload: Partial<Session>) => {
    try {
      await pb.collection('sessions').update(id, {
        ...payload,
        supervisor: (payload as unknown as Record<string, unknown>).supervisor_id,
      })
      await fetchAll()
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, [fetchAll])

  const deleteSession = useCallback(async (id: string) => {
    try {
      await pb.collection('sessions').delete(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, [])

  return { sessions, loading, error, fetchAll, fetchForSupervisor, fetchById, createSession, updateSession, deleteSession }
}
