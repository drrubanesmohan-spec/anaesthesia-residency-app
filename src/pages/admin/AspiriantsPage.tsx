import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'
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
  pending:   'bg-slate-600/40 text-slate-300',
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
    const { data, error: err } = await supabase
      .from('aspirants')
      .insert({
        full_name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        applied_at: appliedAt || null,
      })
      .select()
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as Aspirant)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1e293b] p-5 pb-10 animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold text-white">Add Aspirant</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="rounded-xl bg-slate-700/60 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-slate-600/50">
              <span className="text-xs text-slate-400 w-20 shrink-0">Email</span>
              <input
                type="email"
                placeholder="optional"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              />
            </div>
            <div className="flex items-center px-4 py-2.5 border-b border-slate-600/50">
              <span className="text-xs text-slate-400 w-20 shrink-0">Phone</span>
              <input
                type="tel"
                placeholder="optional"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              />
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-slate-400 w-20 shrink-0">Applied</span>
              <input
                type="date"
                value={appliedAt}
                onChange={e => setAppliedAt(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
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
    <div className="rounded-2xl border border-slate-700 bg-brand-light overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{aspirant.full_name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {aspirant.email && <span className="text-[10px] text-slate-500">{aspirant.email}</span>}
            {aspirant.applied_at && <span className="text-[10px] text-slate-600">Applied {aspirant.applied_at}</span>}
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0', STATUS_COLORS[aspirant.status])}>
          {aspirant.status}
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-slate-700/50 pt-3 space-y-3">
          {aspirant.phone && (
            <p className="text-xs text-slate-400">Phone: {aspirant.phone}</p>
          )}
          {aspirant.notes && (
            <p className="text-xs text-slate-400">{aspirant.notes}</p>
          )}

          {isAdmin && (
            <>
              {/* Status buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(aspirant.id, s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                      aspirant.status === s
                        ? STATUS_COLORS[s] + ' ring-1 ring-current'
                        : 'bg-slate-700/50 text-slate-500 hover:text-slate-300'
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
    supabase.from('aspirants').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setAspirants((data ?? []) as Aspirant[]); setLoading(false) })
  }, [])

  async function handleStatusChange(id: string, status: Status) {
    await supabase.from('aspirants').update({ status }).eq('id', id)
    setAspirants(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleDelete(id: string) {
    await supabase.from('aspirants').delete().eq('id', id)
    setAspirants(prev => prev.filter(a => a.id !== id))
  }

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = aspirants.filter(a => a.status === s).length
    return acc
  }, {} as Record<Status, number>)

  const filtered = filter === 'all' ? aspirants : aspirants.filter(a => a.status === filter)

  return (
    <AppShell title="Aspirants">
      {/* Summary row */}
      {!loading && aspirants.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STATUS_OPTIONS.map(s => (
            <div key={s} className="rounded-xl bg-brand-light border border-slate-700 py-2 text-center">
              <p className={cn('text-lg font-bold', STATUS_COLORS[s].split(' ')[1])}>{counts[s]}</p>
              <p className="text-[9px] text-slate-600 capitalize mt-0.5">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + add row */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
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
        <p className="text-center text-xs text-slate-600 pt-12 italic">No aspirants here.</p>
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
