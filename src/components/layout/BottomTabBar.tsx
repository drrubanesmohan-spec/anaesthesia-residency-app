import { NavLink } from 'react-router-dom'
import { Home, Calendar, Users, LayoutGrid, CheckSquare, LogOut, FileText, BookOpen, Presentation, ClipboardList } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { useEffect, useState } from 'react'
import { pb } from '../../lib/pbClient'

const residentTabs = [
  { to: '/resident', icon: Home, label: 'Home', end: true },
  { to: '/resident/attendance', icon: Calendar, label: 'Посещ.' },
  { to: '/resident/logbook', icon: ClipboardList, label: 'Логбук' },
  { to: '/resident/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/resident/documents', icon: FileText, label: 'Документы' },
]

const supervisorTabs = [
  { to: '/supervisor', icon: Home, label: 'Home', end: true },
  { to: '/supervisor/residents', icon: Users, label: 'Ординаторы' },
  { to: '/supervisor/logbook', icon: ClipboardList, label: 'Логбук' },
  { to: '/supervisor/lectures', icon: Presentation, label: 'Лекции' },
  { to: '/supervisor/tasks', icon: CheckSquare, label: 'Задачи' },
]

const adminTabs = [
  { to: '/admin', icon: Home, label: 'Dashboard', end: true },
  { to: '/admin/manage', icon: LayoutGrid, label: 'Manage' },
  { to: '/admin/logbook', icon: ClipboardList, label: 'Логбук' },
  { to: '/admin/lectures', icon: BookOpen, label: 'Лекции' },
  { to: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
]

export function BottomTabBar() {
  const { appUser, signOut } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (appUser?.role !== 'supervisor') return
    pb.collection('logbook_entries').getList(1, 1, {
      filter: `supervisor = '${appUser.id}' && status = 'submitted'`,
    }).then(r => setPendingCount(r.totalItems)).catch(() => {})
  }, [appUser])

  if (!appUser) return null

  const tabs =
    appUser.role === 'admin'
      ? adminTabs
      : appUser.role === 'supervisor'
      ? supervisorTabs
      : residentTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-800 bg-brand-dark pb-safe">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors',
                isActive ? 'text-brand-accent' : 'text-stone-500 hover:text-stone-300'
              )
            }
          >
            <span className="relative">
              <Icon size={22} className="mb-0.5" />
              {to === '/supervisor/logbook' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => signOut()}
          className="flex flex-1 flex-col items-center justify-center py-2 text-xs text-stone-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={22} className="mb-0.5" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
