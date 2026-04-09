import { NavLink } from 'react-router-dom'
import { Home, Calendar, Stethoscope, Users, BarChart2, ScrollText, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const residentTabs = [
  { to: '/resident', icon: Home, label: 'Home', end: true },
  { to: '/resident/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/resident/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/resident/skills', icon: Stethoscope, label: 'Skills' },
]

const supervisorTabs = [
  { to: '/supervisor', icon: Home, label: 'Home', end: true },
  { to: '/supervisor/sessions', icon: Users, label: 'Residents' },
  { to: '/supervisor/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/supervisor/logs', icon: ScrollText, label: 'Logs' },
  { to: '/supervisor/skills', icon: Stethoscope, label: 'Skills' },
]

const adminTabs = [
  { to: '/admin', icon: Home, label: 'Dashboard', end: true },
  { to: '/admin/manage', icon: LayoutGrid, label: 'Manage' },
  { to: '/admin/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin/logs', icon: ScrollText, label: 'Logs' },
]

export function BottomTabBar() {
  const { appUser } = useAuth()
  if (!appUser) return null

  const tabs =
    appUser.role === 'admin'
      ? adminTabs
      : appUser.role === 'supervisor'
      ? supervisorTabs
      : residentTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-700 bg-brand pb-safe">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors',
                isActive ? 'text-brand-accent' : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            <Icon size={22} className="mb-0.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
