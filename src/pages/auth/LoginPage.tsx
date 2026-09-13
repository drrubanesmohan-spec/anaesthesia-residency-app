import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function LoginPage() {
  const { signIn, appUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Navigate once appUser is available after sign in
  useEffect(() => {
    if (appUser) {
      navigate('/', { replace: true })
    }
  }, [appUser, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // navigation is handled by the useEffect above
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Ordinem" className="mx-auto mb-2 h-32 w-32 object-contain" />
          <h1 className="text-2xl font-bold text-stone-900">ORDINEM</h1>
          <p className="mt-1 text-sm text-stone-500">Residency Program Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@hospital.org"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}
          <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-400">
          <Link to="/forgot-password" className="text-brand-accent hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
