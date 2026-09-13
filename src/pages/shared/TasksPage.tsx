import { useEffect, useState, useCallback } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Flag } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  assigned_to: string | null
  created_by: string | null
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'normal' | 'high'
  created_at: string
  assignee?: { full_name: string } | null
  creator?: { full_name: string } | null
}

interface Profile { id: string; full_name: string; role: string }

const STATUS_LABELS: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-stone-200/60 text-stone-600',
  in_progress: 'bg-amber-500/20 text-amber-400',
  done:        'bg-emerald-500/20 text-emerald-400',
}
const PRIORITY_COLORS: Record<string, string> = {
  low:    'text-stone-400',
  normal: 'text-blue-400',
  high:   'text-red-400',
}
const FILTER_OPTIONS = ['all', 'pending', 'in_progress', 'done'] as const
type Filter = typeof FILTER_OPTIONS[number]

function mapTask(r: Record<string, unknown>): Task {
  const ex = r.expand as Record<string, Record<string, unknown>> | undefined
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    due_date: r.due_date as string | null,
    assigned_to: r.assigned_to as string | null,
    created_by: r.created_by as string | null,
    status: (r.status as Task['status']) ?? 'pending',
    priority: (r.priority as Task['priority']) ?? 'normal',
    created_at: r.created as string,
    assignee: ex?.assigned_to ? { full_name: ex.assigned_to.full_name as string } : null,
    creator: ex?.created_by ? { full_name: ex.created_by.full_name as string } : null,
  }
}

/* ─── Add task modal ─────────────────────────────────────────────── */

function AddTaskModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (task: Task) => void
}) {
  const { appUser } = useAuth()
  const [title,      setTitle]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [dueDate,    setDueDate]    = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority,   setPriority]   = useState<'low' | 'normal' | 'high'>('normal')
  const [people,     setPeople]     = useState<Profile[]>([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    const roleFilter = appUser?.role === 'admin'
      ? "role = 'resident' || role = 'supervisor' || role = 'admin'"
      : "role = 'resident'"
    pb.collection('users').getFullList({ filter: roleFilter, sort: 'full_name' })
      .then(data => setPeople(data.map(r => ({ id: r.id, full_name: r.full_name as string, role: r.role as string }))))
  }, [appUser])

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      const rec = await pb.collection('tasks').create({
        title: title.trim(),
        description: desc.trim() || null,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        created_by: appUser?.id,
        priority,
        status: 'pending',
      })
      const expanded = await pb.collection('tasks').getOne(rec.id, { expand: 'assigned_to,created_by' })
      onSaved(mapTask(expanded as unknown as Record<string, unknown>))
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
          <p className="text-base font-semibold text-stone-900">New Task</p>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          <div className="rounded-xl bg-stone-100 overflow-hidden">
            <div className="flex items-center px-4 py-2.5 border-b border-stone-300">
              <span className="text-xs text-stone-500 w-20 shrink-0">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              />
            </div>
            <div className="flex items-center px-4 py-2.5 border-b border-stone-300">
              <span className="text-xs text-stone-500 w-20 shrink-0">Assign to</span>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
              >
                <option value="" className="bg-stone-100">— None —</option>
                {people.map(p => (
                  <option key={p.id} value={p.id} className="bg-stone-100">{p.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center px-4 py-2.5">
              <span className="text-xs text-stone-500 w-20 shrink-0">Priority</span>
              <div className="flex gap-2">
                {(['low', 'normal', 'high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                      priority === p
                        ? p === 'high' ? 'bg-red-500/30 text-red-400 ring-1 ring-red-500'
                          : p === 'low' ? 'bg-stone-200 text-stone-600 ring-1 ring-stone-400'
                          : 'bg-blue-500/30 text-blue-400 ring-1 ring-blue-500'
                        : 'text-stone-400 hover:text-stone-600'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-stone-900 hover:bg-brand-accent/80 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Task card ──────────────────────────────────────────────────── */

function TaskCard({
  task,
  canEdit,
  onStatusChange,
  onDelete,
}: {
  task: Task
  canEdit: boolean
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const nextStatus: Record<Task['status'], Task['status']> = {
    pending: 'in_progress',
    in_progress: 'done',
    done: 'pending',
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <Flag size={13} className={cn('mt-0.5 shrink-0', PRIORITY_COLORS[task.priority])} />

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-900')}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button
              onClick={() => canEdit && onStatusChange(task.id, nextStatus[task.status])}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full',
                STATUS_COLORS[task.status],
                canEdit && 'cursor-pointer hover:opacity-80'
              )}
            >
              {STATUS_LABELS[task.status]}
            </button>
            {task.due_date && (
              <span className="text-[10px] text-stone-400">Due {task.due_date}</span>
            )}
            {task.assignee && (
              <span className="text-[10px] text-stone-400">→ {(task.assignee as unknown as { full_name: string }).full_name}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-stone-400 hover:text-stone-500 transition-colors shrink-0 mt-0.5"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-stone-200 pt-2">
          {task.description && (
            <p className="text-xs text-stone-500 mb-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-stone-400">
            {task.creator && <span>Created by {(task.creator as unknown as { full_name: string }).full_name}</span>}
            <span>{new Date(task.created_at).toLocaleDateString()}</span>
          </div>
          {canEdit && (
            <button
              onClick={() => onDelete(task.id)}
              className="mt-2 text-xs text-red-500 hover:text-red-400"
            >
              Delete task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Tasks page ─────────────────────────────────────────────────── */

export function TasksPage() {
  const { appUser } = useAuth()
  const canCreate = appUser?.role === 'admin' || appUser?.role === 'supervisor'
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<Filter>('all')
  const [showModal,  setShowModal]  = useState(false)

  const load = useCallback(async () => {
    const filter = appUser?.role === 'resident'
      ? `assigned_to = '${appUser.id}'`
      : ''
    const data = await pb.collection('tasks').getFullList({
      filter,
      sort: '-created',
      expand: 'assigned_to,created_by',
    })
    setTasks(data.map(r => mapTask(r as unknown as Record<string, unknown>)))
    setLoading(false)
  }, [appUser])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, status: Task['status']) {
    await pb.collection('tasks').update(id, { status })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function handleDelete(id: string) {
    await pb.collection('tasks').delete(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <AppShell title="Tasks">
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
        {FILTER_OPTIONS.map(f => (
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
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 ml-auto flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-400 px-3 py-1 text-xs font-medium hover:bg-blue-500/30 transition-colors"
          >
            <Plus size={13} />New
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center pt-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs text-stone-400 pt-12 italic">No tasks here.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit={canCreate}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSaved={t => { setTasks(prev => [t, ...prev]); setShowModal(false) }}
        />
      )}
    </AppShell>
  )
}
