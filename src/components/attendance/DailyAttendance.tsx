import { useEffect, useState, useCallback } from 'react'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react'

interface Resident {
  id: string
  full_name: string
}

interface DailyRecord {
  resident_id: string
  date: string
  status: 'present' | 'absent'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ResidentAttendanceRow({
  resident,
  index,
  record,
  onMark,
}: {
  resident: Resident
  index: number
  record: DailyRecord | undefined
  onMark: (residentId: string, status: 'present' | 'absent') => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  async function handle(status: 'present' | 'absent') {
    if (saving || record?.status === status) return
    setSaving(true)
    await onMark(resident.id, status)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-200 last:border-0">
      <span className="text-xs text-stone-400 w-6 shrink-0">{index + 1}</span>
      <span className="flex-1 text-sm text-stone-900 truncate">{resident.full_name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handle('present')}
          disabled={saving}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            record?.status === 'present'
              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500'
              : 'text-stone-400 hover:text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          <CheckCircle2 size={13} />
          Present
        </button>
        <button
          onClick={() => handle('absent')}
          disabled={saving}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            record?.status === 'absent'
              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500'
              : 'text-stone-400 hover:text-red-400 hover:bg-red-500/10'
          }`}
        >
          <XCircle size={13} />
          Absent
        </button>
      </div>
    </div>
  )
}

export function DailyAttendance({ supervisorDeptId }: { supervisorDeptId: string | null }) {
  const { appUser } = useAuth()
  const [residents, setResidents] = useState<Resident[]>([])
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!supervisorDeptId) { setLoading(false); return }
    pb.collection('resident_assignments').getFullList({
      filter: `department = '${supervisorDeptId}'`,
      expand: 'resident',
    }).then(data => {
      const list = data
        .map(r => {
          const res = r.expand?.resident as Record<string, unknown> | undefined
          if (!res) return null
          return { id: res.id as string, full_name: res.full_name as string }
        })
        .filter((r): r is Resident => r !== null)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      setResidents(list)
      setLoading(false)
    })
  }, [supervisorDeptId])

  const fetchRecords = useCallback(async (date: string) => {
    if (residents.length === 0) return
    const residentIds = new Set(residents.map(r => r.id))
    const data = await pb.collection('daily_attendance').getFullList({
      filter: `date = '${date}'`,
    })
    setRecords(
      data
        .filter(a => residentIds.has(a.resident as string))
        .map(a => ({ resident_id: a.resident as string, date: a.date as string, status: a.status as 'present' | 'absent' }))
    )
  }, [residents])

  useEffect(() => {
    fetchRecords(selectedDate)
  }, [fetchRecords, selectedDate])

  async function handleMark(residentId: string, status: 'present' | 'absent') {
    if (!appUser) return

    const now = new Date().toISOString()
    const existing = await pb.collection('daily_attendance').getFirstListItem(
      `resident = '${residentId}' && date = '${selectedDate}'`
    ).catch(() => null)

    const payload = {
      resident: residentId,
      date: selectedDate,
      status,
      marked_by: appUser.id,
      marked_at: now,
    }

    if (existing) {
      await pb.collection('daily_attendance').update(existing.id, payload)
    } else {
      await pb.collection('daily_attendance').create(payload)
    }

    try {
      await pb.collection('daily_attendance_logs').create({
        resident: residentId,
        date: selectedDate,
        status,
        marked_by: appUser.id,
        marked_at: now,
      })
    } catch { /* log collection may not exist */ }

    setRecords(prev => {
      const exists = prev.find(r => r.resident_id === residentId && r.date === selectedDate)
      if (exists) return prev.map(r => r.resident_id === residentId && r.date === selectedDate ? { ...r, status } : r)
      return [...prev, { resident_id: residentId, date: selectedDate, status }]
    })
  }

  const markedCount = records.filter(r => r.date === selectedDate).length
  const presentCount = records.filter(r => r.date === selectedDate && r.status === 'present').length
  const absentCount = records.filter(r => r.date === selectedDate && r.status === 'absent').length

  if (!supervisorDeptId) return null

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden mb-4">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 border-b border-stone-200 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-400">Daily Attendance</span>
          {markedCount > 0 && (
            <span className="text-xs text-stone-400">
              <span className="text-emerald-400">{presentCount}P</span>
              {' / '}
              <span className="text-red-400">{absentCount}A</span>
              {' / '}{residents.length} total
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-stone-400" />
          : <ChevronUp size={16} className="text-stone-400" />}
      </button>

      {!collapsed && (
        <>
          <div className="px-4 py-3 border-b border-stone-200">
            <input
              type="date"
              value={selectedDate}
              max={today()}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-stone-200 text-xs text-stone-900 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : residents.length === 0 ? (
            <p className="px-4 py-3 text-xs text-stone-400">No residents in your department.</p>
          ) : (
            residents.map((r, i) => (
              <ResidentAttendanceRow
                key={r.id}
                resident={r}
                index={i}
                record={records.find(rec => rec.resident_id === r.id && rec.date === selectedDate)}
                onMark={handleMark}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}
