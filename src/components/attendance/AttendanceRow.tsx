import { cn } from '../../lib/utils'
import type { AttendanceRecord, AttendanceStatus } from '../../types/domain'

const statuses: AttendanceStatus[] = ['present', 'late', 'excused', 'absent']

const statusStyle: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500 text-stone-900',
  absent: 'bg-red-600 text-stone-900',
  late: 'bg-amber-500 text-stone-900',
  excused: 'bg-sky-500 text-stone-900',
}

const statusLabel: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

interface AttendanceRowProps {
  record: AttendanceRecord
  onStatusChange: (residentId: string, status: AttendanceStatus) => void
}

export function AttendanceRow({ record, onStatusChange }: AttendanceRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-stone-900">{record.resident?.full_name ?? 'Unknown'}</p>
        {record.resident?.year && (
          <p className="text-xs text-stone-400">Year {record.resident.year}</p>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap justify-end">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(record.resident_id, s)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-opacity',
              record.status === s
                ? statusStyle[s]
                : 'bg-stone-200 text-stone-500 hover:bg-stone-200'
            )}
          >
            {statusLabel[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
