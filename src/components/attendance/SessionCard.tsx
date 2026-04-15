import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatDate, formatTime } from '../../lib/utils'
import type { Session } from '../../types/domain'

const typeColors: Record<string, string> = {
  theatre: 'bg-purple-500/20 text-purple-400',
  icu: 'bg-red-500/20 text-red-400',
  tutorial: 'bg-blue-500/20 text-blue-400',
  simulation: 'bg-orange-500/20 text-orange-400',
  other: 'bg-stone-300/40 text-stone-500',
}

interface SessionCardProps {
  session: Session
  onClick?: () => void
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:border-stone-400 active:bg-stone-100' : ''}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-stone-900">{session.title}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Calendar size={13} />
              <span>{formatDate(session.scheduled_date)}</span>
              {session.start_time && (
                <>
                  <Clock size={13} className="ml-1" />
                  <span>{formatTime(session.start_time)}{session.end_time ? `–${formatTime(session.end_time)}` : ''}</span>
                </>
              )}
            </div>
            {session.location && (
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <MapPin size={13} />
                <span>{session.location}</span>
              </div>
            )}
            {session.supervisor && (
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <User size={13} />
                <span>{(session.supervisor as { full_name: string }).full_name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge className={typeColors[session.session_type] ?? typeColors.other}>
            {session.session_type.replace('_', ' ')}
          </Badge>
          {session.is_cancelled && (
            <Badge className="bg-red-500/20 text-red-400">Cancelled</Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
