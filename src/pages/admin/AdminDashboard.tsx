import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cacheFetch } from '../../lib/cache'

interface Stats {
  residents: number
  supervisors: number
  present: number
  absent: number
}

export function AdminDashboard() {
  const { appUser } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    cacheFetch(`admin-dashboard-${today}`, async () => {
      const [r, sv, present, absent] = await Promise.all([
        pb.collection('users').getList(1, 1, { filter: "role = 'resident'" }),
        pb.collection('users').getList(1, 1, { filter: "role = 'supervisor'" }),
        pb.collection('daily_attendance').getList(1, 1, { filter: `date = '${today}' && status = 'present'` }),
        pb.collection('daily_attendance').getList(1, 1, { filter: `date = '${today}' && status = 'absent'` }),
      ])
      return {
        residents:   r.totalItems,
        supervisors: sv.totalItems,
        present:     present.totalItems,
        absent:      absent.totalItems,
      }
    }).then(setStats)
  }, [today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title="Dashboard" showLogout>
      <div className="space-y-4">
        {/* Greeting */}
        <div className="rounded-2xl border border-stone-200 bg-brand-light px-5 py-4">
          <p className="text-xs text-stone-400 mb-1">{greeting}</p>
          <p className="text-lg font-semibold text-stone-900">{appUser?.fullName ?? ''}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-3xl font-bold text-sky-400">{stats?.residents ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-1">Residents</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-purple-400">{stats?.supervisors ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-1">Supervisors</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-emerald-400">{stats?.present ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-1">Present today</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-red-400">{stats?.absent ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-1">Absent today</p>
          </Card>
        </div>

        {/* Today's date */}
        <p className="text-center text-xs text-stone-400">{today}</p>
      </div>
    </AppShell>
  )
}
