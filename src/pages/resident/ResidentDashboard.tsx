import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AppShell } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { pb } from '../../lib/pbClient'

interface Stats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
}

export function ResidentDashboard() {
  const { appUser } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!appUser) return
    pb.collection('attendance').getFullList({
      filter: `resident = '${appUser.id}'`,
    }).then(data => {
      if (!data) return
      const s: Stats = { total: data.length, present: 0, absent: 0, late: 0, excused: 0 }
      data.forEach(r => { s[r.status as keyof Stats] = (s[r.status as keyof Stats] as number) + 1 })
      setStats(s)
    })
  }, [appUser])

  const pct = stats && stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : null

  return (
    <AppShell title="Dashboard" showLogout>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-stone-900">
            Hello, {appUser?.fullName.split(' ')[0]}
          </p>
          <p className="text-sm text-stone-500">
            {appUser?.year ? `Year ${appUser.year} Resident` : 'Resident'}
            {appUser?.department ? ` · ${appUser.department}` : ''}
          </p>
        </div>

        {stats && (
          <>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-3">
                Attendance summary
              </p>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold text-stone-900">{pct ?? 0}%</span>
                <span className="mb-1 text-sm text-stone-500">attendance rate</span>
              </div>
              <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-brand-accent transition-all"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Present', value: stats.present, color: 'text-emerald-400' },
                { label: 'Late', value: stats.late, color: 'text-amber-400' },
                { label: 'Excused', value: stats.excused, color: 'text-sky-400' },
                { label: 'Absent', value: stats.absent, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <Card key={label} className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
