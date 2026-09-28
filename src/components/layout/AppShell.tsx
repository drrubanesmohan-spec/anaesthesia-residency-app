import { type ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'
import { TopBar } from './TopBar'

interface AppShellProps {
  title: string
  children: ReactNode
  showBack?: boolean
  showLogout?: boolean
}

export function AppShell({ title, children, showBack, showLogout }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar title={title} showBack={showBack} showLogout={showLogout} />
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">{children}</main>
      <BottomTabBar />
    </div>
  )
}
