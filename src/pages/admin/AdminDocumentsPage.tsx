import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import { AlertCircle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import type { SubmissionStatus } from '../../types/documents'

const GEN_SERVICE = 'https://gen.ordinemmed.ru'

interface SubmissionRow {
  id: string
  resident_name: string
  group_name: string
  status: SubmissionStatus
  yandex_url: string
  error_msg: string
  updated: string
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    draft:       { label: 'Черновик',     cls: 'bg-stone-100 text-stone-500'       },
    submitted:   { label: 'Отправлен',   cls: 'bg-sky-100 text-sky-600'           },
    generating:  { label: 'Генерация…',  cls: 'bg-amber-100 text-amber-600'       },
    done:        { label: 'Готов',        cls: 'bg-emerald-100 text-emerald-600'   },
    error:       { label: 'Ошибка',      cls: 'bg-red-100 text-red-500'           },
    token_error: { label: 'Токен истёк', cls: 'bg-orange-100 text-orange-600'     },
  }
  const { label, cls } = map[status] ?? map.draft
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

export function AdminDocumentsPage() {
  const [rows, setRows]         = useState<SubmissionRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const hasTokenError = rows.some(r => r.status === 'token_error')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [subs, users, groups] = await Promise.all([
      pb.collection('document_submissions').getFullList({ sort: '-updated' }),
      pb.collection('users').getFullList({ fields: 'id,full_name,group' }),
      pb.collection('groups').getFullList({ fields: 'id,name' }),
    ])
    const userMap: Record<string, { name: string; group: string }> = {}
    users.forEach(u => { userMap[u.id] = { name: u.full_name as string, group: u.group as string } })
    const groupMap: Record<string, string> = {}
    groups.forEach(g => { groupMap[g.id] = g.name as string })

    setRows(subs.map(s => ({
      id: s.id,
      resident_name: userMap[s.resident as string]?.name ?? '—',
      group_name: groupMap[userMap[s.resident as string]?.group ?? ''] ?? 'Без группы',
      status: s.status as SubmissionStatus,
      yandex_url: (s.yandex_url as string) || '',
      error_msg: (s.error_msg as string) || '',
      updated: s.updated as string,
    })))
    setLoading(false)
  }

  async function retry(row: SubmissionRow) {
    setRetrying(row.id)
    try {
      const res = await fetch(`${GEN_SERVICE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: row.id }),
      })
      const json = await res.json()
      if (json.url) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'done', yandex_url: json.url } : r))
      } else {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: json.token_error ? 'token_error' : 'error' } : r))
      }
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error' } : r))
    }
    setRetrying(null)
  }

  const byGroup = rows.reduce<Record<string, SubmissionRow[]>>((acc, r) => {
    if (!acc[r.group_name]) acc[r.group_name] = []
    acc[r.group_name].push(r)
    return acc
  }, {})

  return (
    <AppShell title="Документы" showBack>
      <div className="space-y-4">

        {/* Token expired warning */}
        {hasTokenError && (
          <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              Токен Яндекс.Диска истёк. Обновите его в <strong>Manage → Settings</strong>, затем повторите генерацию.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{rows.length} записей</span>
          <button onClick={loadData} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1">
            <RefreshCw size={12} /> Обновить
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center pt-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-stone-400 pt-12">Нет документов</p>
        ) : (
          Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, groupRows]) => (
            <div key={groupName} className="rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">{groupName}</span>
                <span className="text-xs text-stone-400">{groupRows.length} чел.</span>
              </div>
              <div className="divide-y divide-stone-100">
                {groupRows.map(row => (
                  <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-900 truncate">{row.resident_name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(row.updated).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={row.status} />
                      {row.yandex_url && (
                        <a
                          href={row.yandex_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-400 hover:text-brand-accent"
                          title="Скачать"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {(row.status === 'error' || row.status === 'token_error' || row.status === 'submitted') && (
                        <button
                          onClick={() => retry(row)}
                          disabled={retrying === row.id}
                          title="Повторить генерацию"
                          className="text-stone-400 hover:text-brand-accent disabled:opacity-40"
                        >
                          {retrying === row.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <RefreshCw size={14} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  )
}
