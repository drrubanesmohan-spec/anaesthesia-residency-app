import { NavLink } from 'react-router-dom'
import { Home, Calendar, Users, ScrollText, LayoutGrid, CheckSquare, LogOut, GraduationCap, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const residentTabs = [
  { to: '/resident', icon: Home, label: 'Home', end: true },
  { to: '/resident/attendance', icon: Calendar, label: 'Посещ.' },
  { to: '/resident/calendar', icon: Calendar, label: 'Календарь' },
  { to: '/resident/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/resident/documents', icon: FileText, label: 'Документы' },
]

const supervisorTabs = [
  { to: '/supervisor', icon: Home, label: 'Home', end: true },
  { to: '/supervisor/sessions', icon: Users, label: 'Ординаторы' },
  { to: '/supervisor/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/supervisor/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/supervisor/students', icon: GraduationCap, label: 'Students' },
  { to: '/supervisor/logs', icon: ScrollText, label: 'Logs' },
]

const adminTabs = [
  { to: '/admin', icon: Home, label: 'Dashboard', end: true },
  { to: '/admin/manage', icon: LayoutGrid, label: 'Manage' },
  { to: '/admin/documents', icon: FileText, label: 'Docs' },
  { to: '/admin/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/admin/students', icon: GraduationCap, label: 'Students' },
  { to: '/admin/logs', icon: ScrollText, label: 'Logs' },
]

export function BottomTabBar() {
  const { appUser, signOut } = useAuth()
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
            <Icon size={22} className="mb-0.5" />
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
