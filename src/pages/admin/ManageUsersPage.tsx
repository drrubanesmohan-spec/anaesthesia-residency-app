import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import type { UserRole } from '../../types/auth'
import { ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  role: UserRole
}

const sections: { role: UserRole; label: string; color: string; count_color: string }[] = [
  { role: 'admin', label: 'Admins', color: 'text-amber-400', count_color: 'bg-amber-500/20 text-amber-400' },
  { role: 'supervisor', label: 'Supervisors', color: 'text-purple-400', count_color: 'bg-purple-500/20 text-purple-400' },
  { role: 'resident', label: 'Residents', color: 'text-sky-400', count_color: 'bg-sky-500/20 text-sky-400' },
]

export function ManageUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<UserRole, boolean>>({ admin: false, supervisor: false, resident: false })
  const [promoting, setPromoting] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('users').getFullList({ sort: 'full_name' })
      .then(data => {
        setUsers(data.map(r => ({ id: r.id, full_name: r.full_name as string, role: r.role as UserRole })))
        setLoading(false)
      })
  }, [])

  function toggle(role: UserRole) {
    setCollapsed(prev => ({ ...prev, [role]: !prev[role] }))
  }

  async function changeRole(userId: string, newRole: 'admin' | 'supervisor') {
    setPromoting(userId)
    await pb.collection('users').update(userId, { role: newRole })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setPromoting(null)
  }

  return (
    <AppShell title="Users">
      {loading ? (
        <div className="flex justify-center pt-16"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {sections.map(({ role, label, color, count_color }) => {
            const group = users.filter(u => u.role === role)
            const isCollapsed = collapsed[role]
            return (
              <div key={role} className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggle(role)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${count_color}`}>
                      {group.length}
                    </span>
                  </div>
                  {isCollapsed ? <ChevronDown size={16} className="text-stone-400" /> : <ChevronUp size={16} className="text-stone-400" />}
                </button>

                {/* User list */}
                {!isCollapsed && (
                  <div className="border-t border-stone-200">
                    {group.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-stone-400">None</p>
                    ) : (
                      group.map((u, i) => (
                        <div
                          key={u.id}
                          className={`flex items-center px-4 py-2.5 ${i !== group.length - 1 ? 'border-b border-stone-200' : ''}`}
                        >
                          <span className="text-xs text-stone-400 w-6 shrink-0">{i + 1}</span>
                          <span className="text-sm text-stone-900 flex-1">{u.full_name}</span>
                          {role === 'supervisor' && (
                            <button
                              onClick={() => changeRole(u.id, 'admin')}
                              disabled={promoting === u.id}
                              title="Promote to Admin"
                              className="ml-2 text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                            >
                              <ArrowUpCircle size={18} />
                            </button>
                          )}
                          {role === 'admin' && (
                            <button
                              onClick={() => changeRole(u.id, 'supervisor')}
                              disabled={promoting === u.id}
                              title="Demote to Supervisor"
                              className="ml-2 text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors"
                            >
                              <ArrowDownCircle size={18} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
