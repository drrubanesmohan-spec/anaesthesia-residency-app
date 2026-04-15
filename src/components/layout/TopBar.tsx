import { ChevronLeft, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface TopBarProps {
  title: string
  showBack?: boolean
  showLogout?: boolean
}

export function TopBar({ title, showBack, showLogout }: TopBarProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-stone-800 bg-brand-dark px-4 pt-safe">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="mr-2 rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-900"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-stone-900 tracking-wide">{title}</h1>
      {showLogout && (
        <button
          onClick={signOut}
          className="rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-900"
        >
          <LogOut size={20} />
        </button>
      )}
    </header>
  )
}
