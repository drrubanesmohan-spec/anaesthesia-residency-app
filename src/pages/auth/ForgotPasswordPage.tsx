import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '../../lib/pbClient'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await pb.collection('users').requestPasswordReset(email)
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-xl font-bold text-stone-900">Reset password</h1>
        <p className="mb-6 text-sm text-stone-500">
          Enter your email and we'll send a reset link.
        </p>
        {sent ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
            Check your inbox for the reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-4 block text-center text-sm text-brand-accent hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}
