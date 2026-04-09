import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

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
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'resident'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'supervisor'),
      supabase.from('daily_attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
      supabase.from('daily_attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'absent'),
    ]).then(([r, sv, present, absent]) => {
      setStats({
        residents:   r.count       ?? 0,
        supervisors: sv.count      ?? 0,
        present:     present.count ?? 0,
        absent:      absent.count  ?? 0,
      })
    })
  }, [today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title="Dashboard" showLogout>
      <div className="space-y-4">
        {/* Greeting */}
        <div className="rounded-2xl border border-slate-700 bg-brand-light px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">{greeting}</p>
          <p className="text-lg font-semibold text-white">{appUser?.fullName ?? ''}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-3xl font-bold text-sky-400">{stats?.residents ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Residents</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-purple-400">{stats?.supervisors ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Supervisors</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-emerald-400">{stats?.present ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Present today</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-red-400">{stats?.absent ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Absent today</p>
          </Card>
        </div>

        {/* Today's date */}
        <p className="text-center text-xs text-slate-600">{today}</p>
      </div>
    </AppShell>
  )
}
