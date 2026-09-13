import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface Aspirant {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  notes: string | null
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected'
  applied_at: string | null
  created_at: string
}

const STATUS_OPTIONS = ['pending', 'reviewing', 'accepted', 'rejected'] as const
type Status = typeof STATUS_OPTIONS[number]

const STATUS_COLORS: Record<Status, string> = {
  pending:   'bg-stone-200/60 text-stone-600',
  reviewing: 'bg-amber-500/20 text-amber-400',
  accepted:  'bg-emerald-500/20 text-emerald-400',
  rejected:  'bg-red-500/20 text-red-400',
}

const FILTERS = ['all', ...STATUS_OPTIONS] as const
type Filter = typeof FILTERS[number]

/* ─── Add aspirant modal ─────────────────────────────────────────── */

function AddAspirantModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (a: Aspirant) => void
}) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [notes,     setNotes]     = useState('')
  const [appliedAt, setAppliedAt] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function submit() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const rec = await pb.collection('aspirants').create({
        full_name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        applied_at: appliedAt || null,
        status: 'pending',
      })
      onSaved({
        id: rec.id,
        full_name: rec.full_name as string,
        email: rec.email as string | null,
        phone: rec.phone as string | null,
        notes: rec.notes as string | null,
        status: (rec.status as Status) ?? 'pending',
        applied_at: rec.applied_at as string | null,
        created_at: rec.created as string,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-10 animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold text-stone-900">Add Aspirant</p>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="rounded-xl bg-stone-100 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-stone-300">
              <span className="text-xs text-stone-500 w-20 shrink-0">Email</span>
              <input
                type="email"
                placeholder="optional"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 outline-none"
              />
            </div>
            <div className="flex items-center px-4 py-2.5 border-b border-stone-300">
              <span className="text-xs text-stone-500 w-20 shrink-0">Phone</span>
              <input
                type="tel"
                placeholder="optional"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 outline-none"
              />
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-stone-500 w-20 shrink-0">Applied</span>
              <input
                type="date"
                value={appliedAt}
                onChange={e => setAppliedAt(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              />
            </div>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-stone-900 hover:bg-brand-accent/80 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Add Aspirant'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Aspirant card ──────────────────────────────────────────────── */

function AspirantCard({
  aspirant,
  isAdmin,
  onStatusChange,
  onDelete,
}: {
  aspirant: Aspirant
  isAdmin: boolean
  onStatusChange: (id: string, status: Status) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">{aspirant.full_name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {aspirant.email && <span className="text-[10px] text-stone-400">{aspirant.email}</span>}
            {aspirant.applied_at && <span className="text-[10px] text-stone-400">Applied {aspirant.applied_at}</span>}
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0', STATUS_COLORS[aspirant.status])}>
          {aspirant.status}
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-stone-400 hover:text-stone-500 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-stone-200 pt-3 space-y-3">
          {aspirant.phone && (
            <p className="text-xs text-stone-500">Phone: {aspirant.phone}</p>
          )}
          {aspirant.notes && (
            <p className="text-xs text-stone-500">{aspirant.notes}</p>
          )}

          {isAdmin && (
            <>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(aspirant.id, s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                      aspirant.status === s
                        ? STATUS_COLORS[s] + ' ring-1 ring-current'
                        : 'bg-stone-100 text-stone-400 hover:text-stone-600'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onDelete(aspirant.id)}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Aspirants page ─────────────────────────────────────────────── */

export function AspiriantsPage() {
  const { appUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'

  const [aspirants,  setAspirants]  = useState<Aspirant[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<Filter>('all')
  const [showModal,  setShowModal]  = useState(false)

  useEffect(() => {
    pb.collection('aspirants').getFullList({ sort: '-created' })
      .then(data => {
        setAspirants(data.map(r => ({
          id: r.id,
          full_name: r.full_name as string,
          email: r.email as string | null,
          phone: r.phone as string | null,
          notes: r.notes as string | null,
          status: (r.status as Status) ?? 'pending',
          applied_at: r.applied_at as string | null,
          created_at: r.created as string,
        })))
        setLoading(false)
      })
  }, [])

  async function handleStatusChange(id: string, status: Status) {
    await pb.collection('aspirants').update(id, { status })
    setAspirants(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleDelete(id: string) {
    await pb.collection('aspirants').delete(id)
    setAspirants(prev => prev.filter(a => a.id !== id))
  }

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = aspirants.filter(a => a.status === s).length
    return acc
  }, {} as Record<Status, number>)

  const filtered = filter === 'all' ? aspirants : aspirants.filter(a => a.status === filter)

  return (
    <AppShell title="Aspirants">
      {!loading && aspirants.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STATUS_OPTIONS.map(s => (
            <div key={s} className="rounded-xl bg-brand-light border border-stone-200 py-2 text-center">
              <p className={cn('text-lg font-bold', STATUS_COLORS[s].split(' ')[1])}>{counts[s]}</p>
              <p className="text-[9px] text-stone-400 capitalize mt-0.5">{s}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
              filter === f
                ? 'bg-brand-accent text-white'
                : 'bg-stone-100 text-stone-500 hover:text-stone-900'
            )}
          >
            {f === 'all' ? `All (${aspirants.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 ml-auto flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-400 px-3 py-1 text-xs font-medium hover:bg-blue-500/30 transition-colors"
          >
            <Plus size={13} />Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center pt-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs text-stone-400 pt-12 italic">No aspirants here.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <AspirantCard
              key={a.id}
              aspirant={a}
              isAdmin={isAdmin}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddAspirantModal
          onClose={() => setShowModal(false)}
          onSaved={a => setAspirants(prev => [a, ...prev])}
        />
      )}
    </AppShell>
  )
}
