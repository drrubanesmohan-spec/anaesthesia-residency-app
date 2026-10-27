import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { pb } from '../../lib/pbClient'
import { cn } from '../../lib/utils'
import { AlertCircle, ExternalLink, RefreshCw, Loader2, Upload, Trash2, FolderOpen, FileText, FolderInput } from 'lucide-react'
import type { SubmissionStatus } from '../../types/documents'

const GEN_SERVICE = 'https://gen.ordinemmed.ru'

/* ─── Submissions tab ─────────────────────────────────────────────── */

interface SubmissionRow {
  id: string; resident_name: string; group_name: string
  status: SubmissionStatus; yandex_url: string; error_msg: string; updated: string
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    draft:       { label: 'Черновик',     cls: 'bg-stone-100 text-stone-500'   },
    submitted:   { label: 'Отправлен',   cls: 'bg-sky-100 text-sky-600'       },
    generating:  { label: 'Генерация…',  cls: 'bg-amber-100 text-amber-600'   },
    done:        { label: 'Готов',        cls: 'bg-emerald-100 text-emerald-600'},
    error:       { label: 'Ошибка',      cls: 'bg-red-100 text-red-500'       },
    token_error: { label: 'Токен истёк', cls: 'bg-orange-100 text-orange-600' },
  }
  const { label, cls } = map[status] ?? map.draft
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
}

function SubmissionsTab() {
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
    <div className="space-y-4">
      {hasTokenError && (
        <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>Токен Яндекс.Диска истёк. Обновите его в <strong>Manage → Settings</strong>.</span>
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
                    <p className="text-xs text-stone-400 mt-0.5">{new Date(row.updated).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={row.status} />
                    {row.yandex_url && (
                      <a href={row.yandex_url} target="_blank" rel="noopener noreferrer"
                        className="text-stone-400 hover:text-brand-accent" title="Скачать">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {(row.status === 'error' || row.status === 'token_error' || row.status === 'submitted') && (
                      <button onClick={() => retry(row)} disabled={retrying === row.id}
                        title="Повторить" className="text-stone-400 hover:text-brand-accent disabled:opacity-40">
                        {retrying === row.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
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
  )
}

/* ─── Upload tab ──────────────────────────────────────────────────── */

interface SharedDoc {
  id: string; name: string; file: string; folder: string; size: number; created: string
}

function UploadTab() {
  const [docs, setDocs]         = useState<SharedDoc[]>([])
  const [loading, setLoading]   = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [folder, setFolder]     = useState('Общее')
  const [errors, setErrors]     = useState<string[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const filesRef  = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    const recs = await pb.collection('shared_documents').getFullList({ sort: '-created' }).catch(() => [])
    setDocs((recs as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      name: r.name as string,
      file: r.file as string,
      folder: (r.folder as string) || 'Общее',
      size: (r.size as number) || 0,
      created: r.created as string,
    })))
    setLoading(false)
  }

  async function uploadSingle(file: File, destFolder: string): Promise<SharedDoc> {
    const formData = new FormData()
    formData.append('name', file.name)
    formData.append('folder', destFolder)
    formData.append('size', String(file.size))
    formData.append('file', file, file.name)
    const rec = await pb.collection('shared_documents').create(formData)
    return {
      id: rec.id,
      name: file.name,
      file: rec.file as string,
      folder: destFolder,
      size: file.size,
      created: rec.created as string,
    }
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList)
    if (!files.length) return
    setErrors([])
    setProgress({ done: 0, total: files.length })
    const errs: string[] = []
    for (let i = 0; i < files.length; i++) {
      try {
        const doc = await uploadSingle(files[i], folder)
        setDocs(prev => [doc, ...prev])
      } catch (e: unknown) {
        errs.push(e instanceof Error ? e.message : `${files[i].name}: ошибка`)
      }
      setProgress({ done: i + 1, total: files.length })
    }
    if (errs.length) setErrors(errs)
    setProgress(null)
    if (filesRef.current)  filesRef.current.value = ''
    if (folderRef.current) folderRef.current.value = ''
  }

  async function deleteDoc(doc: SharedDoc) {
    setDeleting(doc.id)
    try {
      await pb.collection('shared_documents').delete(doc.id)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch { /* ignore */ }
    setDeleting(null)
  }

  function fileUrl(doc: SharedDoc) {
    return doc.file ? `${pb.baseURL}/api/files/shared_documents/${doc.id}/${doc.file}` : ''
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const uploading = progress !== null
  const byFolder = docs.reduce<Record<string, SharedDoc[]>>((acc, d) => {
    const f = d.folder || 'Общее'
    if (!acc[f]) acc[f] = []
    acc[f].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-2xl border border-stone-200 bg-brand-light overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Загрузить</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Папка назначения</label>
            <input
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="Общее"
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          <input ref={filesRef} type="file" multiple className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)} />
          <input ref={folderRef} type="file" className="hidden"
            // @ts-expect-error webkitdirectory is non-standard
            webkitdirectory="true"
            onChange={e => e.target.files && handleFiles(e.target.files)} />

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => filesRef.current?.click()} disabled={uploading}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm text-stone-400 hover:border-brand-accent hover:text-brand-accent transition-colors disabled:opacity-50">
              <Upload size={15} /> Файлы
            </button>
            <button onClick={() => folderRef.current?.click()} disabled={uploading}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm text-stone-400 hover:border-brand-accent hover:text-brand-accent transition-colors disabled:opacity-50">
              <FolderInput size={15} /> Папка
            </button>
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Загрузка…</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-brand-accent rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 space-y-0.5">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertCircle size={11} className="mt-px shrink-0" /> {e}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded docs */}
      {loading ? (
        <div className="flex justify-center pt-8"><Spinner /></div>
      ) : docs.length === 0 ? (
        <p className="text-center text-sm text-stone-400 pt-8">Нет загруженных документов</p>
      ) : (
        Object.entries(byFolder).sort(([a], [b]) => a.localeCompare(b)).map(([folderName, folderDocs]) => (
          <div key={folderName} className="rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
              <FolderOpen size={13} className="text-stone-400" />
              <span className="text-xs font-semibold text-stone-600">{folderName}</span>
              <span className="text-xs text-stone-400">{folderDocs.length}</span>
            </div>
            <div className="divide-y divide-stone-100">
              {folderDocs.map(doc => (
                <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
                  <FileText size={15} className="text-stone-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900 truncate">{doc.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {formatSize(doc.size)} · {new Date(doc.created).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.file && (
                      <a href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
                        className="text-stone-400 hover:text-brand-accent" title="Открыть">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => deleteDoc(doc)} disabled={deleting === doc.id}
                      className="text-stone-300 hover:text-red-400 disabled:opacity-40">
                      {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────── */

type Tab = 'submissions' | 'upload' | 'kafedra'

export function AdminDocumentsPage() {
  const [tab, setTab] = useState<Tab>('kafedra')

  return (
    <AppShell title="Документы" showBack>
      <div className="space-y-4">
        <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
          <button
            onClick={() => setTab('kafedra')}
            className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              tab === 'kafedra' ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600')}
          >
            Кафедра · ИИ
          </button>
          <button
            onClick={() => setTab('submissions')}
            className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              tab === 'submissions' ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600')}
          >
            Инд. планы
          </button>
          <button
            onClick={() => setTab('upload')}
            className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              tab === 'upload' ? 'bg-white text-stone-900 shadow' : 'text-stone-400 hover:text-stone-600')}
          >
            Загрузить
          </button>
        </div>
        {tab === 'upload' ? <UploadTab /> : tab === 'kafedra' ? (
          <iframe
            src="/kafedra/"
            title="Кафедра"
            className="block w-full rounded-xl border border-stone-200 bg-white"
            style={{ height: 'calc(100vh - 12.5rem)', minHeight: 480 }}
          />
        ) : <SubmissionsTab />}
      </div>
    </AppShell>
  )
}
