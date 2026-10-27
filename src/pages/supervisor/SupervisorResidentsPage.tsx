import { useEffect, useState } from 'react'
import { Plus, X, Pencil, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import type { Hospital } from '../../hooks/useHospitals'
import type { Assignment } from '../../hooks/useAssignments'

interface Resident {
  id: string
  full_name: string
  group: string
  groupName: string
}

interface Group { id: string; name: string }

/* ─── Assignment row ─────────────────────────────────────────── */
function AssignRow({
  resident,
  index,
  hospitals,
  assignments,
  onAssign,
}: {
  resident: Resident
  index: number
  hospitals: Hospital[]
  assignments: Assignment[]
  onAssign: (residentId: string, hospitalId: string, deptId: string, current: Assignment | undefined) => Promise<void>
}) {
  const current = assignments.find(a => a.resident === resident.id)
  const [selHospital, setSelHospital] = useState(current?.hospital ?? '')
  const [selDept,     setSelDept]     = useState(current?.department ?? '')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    setSelHospital(current?.hospital ?? '')
    setSelDept(current?.department ?? '')
  }, [current?.hospital, current?.department])

  const depts = selHospital
    ? (hospitals.find(h => h.id === selHospital)?.departments ?? [])
    : []

  const currentHospital = hospitals.find(h => h.id === current?.hospital)
  const currentDept     = currentHospital?.departments.find(d => d.id === current?.department)

  const isDirty =
    selHospital !== (current?.hospital ?? '') ||
    selDept     !== (current?.department ?? '')

  async function handleSave() {
    if (!selHospital || !selDept) return
    setSaving(true)
    await onAssign(resident.id, selHospital, selDept, current)
    setSaving(false)
  }

  return (
    <div className="px-4 py-3 border-b border-stone-200 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-stone-400 w-6 shrink-0">{index + 1}</span>
        <span className="text-sm font-medium text-stone-900 flex-1">{resident.full_name}</span>
        {resident.groupName && (
          <span className="text-xs text-stone-400 shrink-0">{resident.groupName}</span>
        )}
        {currentHospital ? (
          <span className="text-xs text-sky-500 truncate max-w-[120px]">
            {currentDept ? `${currentHospital.name} / ${currentDept.name}` : currentHospital.name}
          </span>
        ) : (
          <span className="text-xs text-stone-400 italic">Unassigned</span>
        )}
      </div>
      <div className="ml-6 flex items-center gap-2 flex-wrap">
        <select
          value={selHospital}
          onChange={e => { setSelHospital(e.target.value); setSelDept('') }}
          className="flex-1 min-w-[110px] bg-stone-100 text-xs text-stone-900 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-accent"
        >
          <option value="">Hospital</option>
          {hospitals.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select
          value={selDept}
          onChange={e => setSelDept(e.target.value)}
          disabled={!selHospital || depts.length === 0}
          className="flex-1 min-w-[110px] bg-stone-100 text-xs text-stone-900 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-accent disabled:opacity-40"
        >
          <option value="">Department</option>
          {depts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {isDirty && selHospital && selDept && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold bg-brand-accent text-white disabled:opacity-50"
          >
            {saving ? '…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────── */
type Seg = 'residents' | 'assignments'

export function SupervisorResidentsPage() {
  const { appUser } = useAuth()

  const [seg, setSeg] = useState<Seg>('residents')

  // Residents + groups
  const [residents,  setResidents]  = useState<Resident[]>([])
  const [groups,     setGroups]     = useState<Group[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // Inline edit/add/delete
  const [search,    setSearch]    = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName,  setEditName]  = useState('')
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newEmail,  setNewEmail]  = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [newGroup,  setNewGroup]  = useState('')
  const [saving,    setSaving]    = useState(false)

  // Assignments + hospitals — fetched once at this level, passed down
  const [assignments,       setAssignments]       = useState<Assignment[]>([])
  const [hospitals,         setHospitals]         = useState<Hospital[]>([])
  const [assignCollapsed,   setAssignCollapsed]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [resData, grpData, assignData, hospData, deptData] = await Promise.all([
          pb.collection('users').getFullList({ filter: "role = 'resident'", sort: 'full_name' }),
          pb.collection('groups').getFullList({ sort: 'name' }),
          pb.collection('resident_assignments').getFullList(),
          pb.collection('hospitals').getFullList({ sort: 'name' }),
          pb.collection('departments').getFullList({ sort: 'name' }),
        ])

        const gMap: Record<string, string> = {}
        grpData.forEach(g => { gMap[g.id] = g['name'] as string })

        setGroups(grpData.map(g => ({ id: g.id, name: g['name'] as string })))
        setResidents(resData.map(r => ({
          id: r.id,
          full_name: r.full_name as string,
          group: (r.group as string) || '',
          groupName: gMap[(r.group as string) || ''] || '',
        })))

        setAssignments(assignData.map(r => ({
          id: r.id,
          resident:    r.resident    as string,
          hospital:    r.hospital    as string | null,
          department:  r.department  as string | null,
          assigned_at: r.assigned_at as string | null,
          assigned_by: r.assigned_by as string | null,
        })))

        const depts = deptData as unknown as { id: string; hospital: string; name: string }[]
        setHospitals(hospData.map(h => ({
          id: h.id,
          name: h.name as string,
          departments: depts.filter(d => d.hospital === h.id),
        })))
      } catch (e) {
        setError((e as Error).message)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveName(id: string) {
    if (!editName.trim()) return
    await pb.collection('users').update(id, { full_name: editName.trim() })
    setResidents(prev => prev.map(r => r.id === id ? { ...r, full_name: editName.trim() } : r))
    setEditingId(null)
  }

  async function deleteResident(id: string) {
    if (!confirm('Delete this resident?')) return
    setDeleting(id)
    try {
      await pb.collection('users').delete(id)
      setResidents(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert((e as Error).message)
    }
    setDeleting(null)
  }

  async function addResident() {
    if (!newName.trim() || !newEmail.trim() || !newPass.trim()) return
    setSaving(true)
    try {
      const rec = await pb.collection('users').create({
        email: newEmail.trim(),
        password: newPass,
        passwordConfirm: newPass,
        full_name: newName.trim(),
        role: 'resident',
        emailVisibility: true,
        temp_password: newPass,
        group: newGroup || null,
      })
      const gName = groups.find(g => g.id === newGroup)?.name ?? ''
      setResidents(prev =>
        [...prev, { id: rec.id, full_name: rec.full_name as string, group: newGroup, groupName: gName }]
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
      )
      setNewName(''); setNewEmail(''); setNewPass(''); setNewGroup('')
      setShowAdd(false)
    } catch (e) {
      alert((e as Error).message)
    }
    setSaving(false)
  }

  async function handleAssign(
    residentId: string,
    hospitalId: string,
    deptId: string,
    current: Assignment | undefined,
  ) {
    if (!appUser) return
    const payload = {
      resident:    residentId,
      hospital:    hospitalId,
      department:  deptId,
      assigned_by: appUser.id,
      assigned_at: new Date().toISOString(),
    }
    if (current) {
      const existing = await pb.collection('resident_assignments')
        .getFirstListItem(`resident = '${residentId}'`).catch(() => null)
      if (existing) {
        await pb.collection('resident_assignments').update(existing.id, payload)
        setAssignments(prev => prev.map(a => a.resident === residentId ? { ...a, ...payload } : a))
        return
      }
    }
    const rec = await pb.collection('resident_assignments').create(payload)
    setAssignments(prev => [...prev, { id: rec.id, ...payload }])
  }

  const filtered = residents.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const byGroup = filtered.reduce<Record<string, Resident[]>>((acc, r) => {
    const key = r.groupName || 'No Group'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  if (loading) return (
    <AppShell title="Ординаторы">
      <div className="flex justify-center pt-12"><Spinner /></div>
    </AppShell>
  )

  if (error) return (
    <AppShell title="Ординаторы">
      <p className="text-center text-sm text-red-400 pt-12">{error}</p>
    </AppShell>
  )

  return (
    <AppShell title="Ординаторы">
      {/* Segment switcher */}
      <div className="flex rounded-xl bg-stone-100 p-1 mb-4 gap-1">
        <button
          onClick={() => setSeg('residents')}
          className={cn(
            'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
            seg === 'residents' ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600'
          )}
        >
          Ординаторы
        </button>
        <button
          onClick={() => setSeg('assignments')}
          className={cn(
            'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
            seg === 'assignments' ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600'
          )}
        >
          Назначения
        </button>
      </div>

      {seg === 'residents' ? (
        <div className="space-y-3">
          {/* Search + add */}
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск…"
              className="flex-1 rounded-xl bg-stone-100 px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-brand-accent"
            />
            <button
              onClick={() => setShowAdd(v => !v)}
              className={cn(
                'flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                showAdd
                  ? 'bg-red-50 text-red-400'
                  : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20'
              )}
            >
              {showAdd ? <X size={13} /> : <Plus size={13} />}
              {showAdd ? 'Отмена' : 'Добавить'}
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Новый ординатор</p>
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="ФИО"
                className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <input
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="Email" type="email"
                className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <input
                value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Временный пароль (мин. 5 символов)" type="password"
                className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <select
                value={newGroup} onChange={e => setNewGroup(e.target.value)}
                className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
              >
                <option value="">— Группа (не обязательно) —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button
                onClick={addResident}
                disabled={saving || !newName.trim() || !newEmail.trim() || newPass.trim().length < 5}
                className="w-full rounded-lg bg-brand-accent py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Добавление…' : 'Добавить ординатора'}
              </button>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-stone-400 pt-8 italic">Ординаторы не найдены.</p>
          ) : (
            Object.entries(byGroup)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupName, members]) => (
                <div key={groupName} className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-200">
                    <span className="text-xs font-semibold text-stone-600">{groupName}</span>
                    <span className="text-xs text-stone-400">{members.length} чел.</span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {members.map((r, i) => (
                      <div key={r.id} className="flex items-center px-4 py-2.5 gap-2">
                        <span className="text-xs text-stone-400 w-6 shrink-0">{i + 1}</span>
                        {editingId === r.id ? (
                          <>
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveName(r.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              autoFocus
                              className="flex-1 rounded bg-stone-100 px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
                            />
                            <button onClick={() => saveName(r.id)} className="text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-stone-900">{r.full_name}</span>
                            <button
                              onClick={() => { setEditingId(r.id); setEditName(r.full_name) }}
                              className="text-stone-400 hover:text-brand-accent transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteResident(r.id)}
                              disabled={deleting === r.id}
                              className="text-stone-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}

          <p className="text-center text-xs text-stone-400 pt-1">{residents.length} ординаторов</p>
        </div>
      ) : (
        /* Assignments tab */
        <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
          <button
            onClick={() => setAssignCollapsed(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3 border-b border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-sky-400">Resident Assignments</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400">
                {residents.length}
              </span>
            </div>
            {assignCollapsed
              ? <ChevronDown size={16} className="text-stone-400" />
              : <ChevronUp   size={16} className="text-stone-400" />}
          </button>

          {!assignCollapsed && (
            residents.length === 0 ? (
              <p className="px-4 py-3 text-xs text-stone-400">No residents found.</p>
            ) : (
              residents.map((r, i) => (
                <AssignRow
                  key={r.id}
                  resident={r}
                  index={i}
                  hospitals={hospitals}
                  assignments={assignments}
                  onAssign={handleAssign}
                />
              ))
            )
          )}
        </div>
      )}
    </AppShell>
  )
}
