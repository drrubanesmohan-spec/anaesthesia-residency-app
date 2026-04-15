import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabaseClient'
import type { Session, SessionType } from '../../types/domain'
import type { AppUser } from '../../types/auth'

interface SessionFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  session?: Session | null
  currentUser: AppUser
}

const sessionTypes: { value: SessionType; label: string }[] = [
  { value: 'theatre', label: 'Theatre' },
  { value: 'icu', label: 'ICU' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'other', label: 'Other' },
]

export function SessionFormModal({ open, onClose, onSaved, session, currentUser }: SessionFormModalProps) {
  const [title, setTitle] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>('theatre')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [notes, setNotes] = useState('')
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // Fetch supervisors
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'supervisor')
      .order('full_name')
      .then(({ data }) => setSupervisors(data ?? []))

    if (session) {
      setTitle(session.title)
      setSessionType(session.session_type)
      setLocation(session.location ?? '')
      setDate(session.scheduled_date)
      setStartTime(session.start_time?.slice(0, 5) ?? '')
      setEndTime(session.end_time?.slice(0, 5) ?? '')
      setSupervisorId(session.supervisor_id ?? '')
      setNotes(session.notes ?? '')
    } else {
      setTitle(''); setSessionType('theatre'); setLocation(''); setDate('')
      setStartTime(''); setEndTime(''); setSupervisorId(''); setNotes('')
    }
  }, [open, session])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !date) return
    setLoading(true)
    setError(null)

    const payload = {
      title,
      session_type: sessionType,
      location: location || null,
      scheduled_date: date,
      start_time: startTime || null,
      end_time: endTime || null,
      supervisor_id: supervisorId || null,
      notes: notes || null,
      created_by: currentUser.id,
    }

    const { error } = session
      ? await supabase.from('sessions').update(payload).eq('id', session.id)
      : await supabase.from('sessions').insert(payload)

    if (error) setError(error.message)
    else { onSaved(); onClose() }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? 'Edit Session' : 'New Session'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-600">Type</label>
          <select
            value={sessionType}
            onChange={e => setSessionType(e.target.value as SessionType)}
            className="w-full rounded-xl border border-stone-300 bg-brand-light px-4 py-3 text-sm text-stone-900 focus:border-brand-accent focus:outline-none"
          >
            {sessionTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          <Input label="End time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
        {supervisors.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-600">Supervisor</label>
            <select
              value={supervisorId}
              onChange={e => setSupervisorId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-brand-light px-4 py-3 text-sm text-stone-900 focus:border-brand-accent focus:outline-none"
            >
              <option value="">— None —</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button type="submit" loading={loading} className="w-full mt-2">
          {session ? 'Save changes' : 'Create session'}
        </Button>
      </form>
    </Modal>
  )
}
