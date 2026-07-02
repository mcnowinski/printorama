import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Search, Settings, Users, Plus, Loader2, Upload, File, X, Pencil, Clock } from 'lucide-react'
import { statusColors, jobTypeColors } from '../../lib/colors'

const MAX_FILE_SIZE_MB = 50

function formatDate(d: string) {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  let hh = date.getHours()
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12 || 12
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss} ${ampm}`
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<any[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  
  const [acceptedExtensions, setAcceptedExtensions] = useState<string[]>([])
  const [addFile, setAddFile] = useState<File | null>(null)
  const [addFileError, setAddFileError] = useState<string | null>(null)
  const addFileInputRef = useRef<HTMLInputElement>(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [jobTypeOptions, setJobTypeOptions] = useState<{ label: string }[]>([])
  const [addForm, setAddForm] = useState({
    title: '', studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED', jobType: '',
  })

  useEffect(() => {
    loadJobs()
    loadQueue()
    supabase.from('dropdown_options').select('label').eq('category', 'ACCEPTED_FILE_TYPE').order('sort_order').then(({ data }) => {
      setAcceptedExtensions((data || []).map((d: any) => d.label))
    })
    supabase.from('dropdown_options').select('label').eq('category', 'JOB_TYPE').order('sort_order').then(({ data }) => {
      setJobTypeOptions(data || [])
    })
  }, [])

  async function loadJobs() {
    const { data } = await supabase.from('jobs').select('*, printers(name, status)').order('created_at', { ascending: false })
    setJobs(data || [])
  }

  async function loadQueue() {
    const { data } = await supabase.from('job_queue').select('*').eq('status', 'RECEIVED').order('created_at', { ascending: false })
    setQueue(data || [])
  }

  async function handleAddJob() {
    if (!addForm.title.trim() || !addForm.studentName.trim() || !addForm.studentEmail.trim()) return
    setAdding(true)

    let fileUrl: string | null = null
    if (addFile) {
      const fileExt = addFile.name.split('.').pop()
      const filePath = `${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('job-files').upload(filePath, addFile)
      if (uploadError) { console.error(uploadError); setAdding(false); return }
      const { data: urlData } = supabase.storage.from('job-files').getPublicUrl(filePath)
      fileUrl = urlData.publicUrl
    }

    const { data: newJob } = await supabase.from('jobs').insert({
      title: addForm.title.trim(),
      student_name: addForm.studentName.trim(),
      student_email: addForm.studentEmail.trim(),
      student_notes: addForm.studentNotes.trim() || null,
      status: addForm.status,
      submitted_at: new Date().toISOString(),
      file_url: fileUrl,
      job_type: addForm.jobType.trim(),
    }).select('id').single()

    if (newJob) {
      await supabase.from('job_history').insert({
        job_id: newJob.id,
        field: 'status',
        old_value: null,
        new_value: addForm.status,
      })
    }
    setAdding(false)
    setShowAddForm(false)
    setAddFile(null)
    setAddFileError(null)
    setAddForm({ title: '', studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED', jobType: ''})
    loadJobs()
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'created_at' ? 'desc' : 'asc')
    }
    setPage(0)
  }

  const allItems = [
    ...queue.map((q: any) => ({ ...q, _isQueue: true as const })),
    ...jobs.map((j: any) => ({ ...j, _isQueue: false as const })),
  ]

  const filtered = allItems
    .filter((item) => {
      if (filter !== 'ALL') {
        if (item._isQueue) return filter === 'RECEIVED'
        if (item.status !== filter) return false
      }
      if (search && !(item.title || '').toLowerCase().includes(search.toLowerCase()) &&
          !item.student_name.toLowerCase().includes(search.toLowerCase()) &&
          !item.student_email.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'student_name') cmp = a.student_name.localeCompare(b.student_name)
      else if (sortField === 'status') {
        const av = a._isQueue ? 'RECEIVED' : a.status
        const bv = b._isQueue ? 'RECEIVED' : b.status
        cmp = av.localeCompare(bv)
      } else if (sortField === 'printer') {
        cmp = (a.printers?.name || '').localeCompare(b.printers?.name || '')
      } else {
        const at = a.submitted_at || a.created_at
        const bt = b.submitted_at || b.created_at
        cmp = new Date(at).getTime() - new Date(bt).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const statuses = [...new Set(['PROCESSING', ...jobs.map((j) => j.status)])]
  const isAdmin = profile?.role === 'ADMINISTRATOR'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {/* <p className="text-sm text-neutral-500">
          {isAdmin ? 'Administrator' : 'Manager'} — {profile?.name}
        </p> */}
      </div>

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => navigate('/manage/users')}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <Users className="h-5 w-5 text-neutral-500" />
            <div><p className="font-medium text-sm">User Management</p><p className="text-xs text-neutral-500">Invite and manage staff accounts</p></div>
          </button>
          <button onClick={() => navigate('/manage/settings')}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            <Settings className="h-5 w-5 text-neutral-500" />
            <div><p className="font-medium text-sm">Settings</p><p className="text-xs text-neutral-500">Tools, system config, dropdown lists</p></div>
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Job List</h2>
          <div className="flex items-center gap-3">
            {/* <p className="text-sm text-neutral-500">{filtered.length} total{queue.length > 0 ? ` (${queue.length} pending)` : ''}</p> */}
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-2 h-4 w-4" /> Add Job
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card><CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title</Label>
                <Input value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} placeholder="My Job" />
              </div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={addForm.jobType} onChange={(e) => setAddForm({ ...addForm, jobType: e.target.value })}>
                  <option value="">Select type...</option>
                  {jobTypeOptions.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2"><Label>Student Name</Label>
                <Input value={addForm.studentName} onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2"><Label>Student Email</Label>
                <Input value={addForm.studentEmail} onChange={(e) => setAddForm({ ...addForm, studentEmail: e.target.value })} placeholder="jane@doe.com" />
              </div>
              <div className="col-span-2 space-y-2"><Label>Instructions</Label>
                <Textarea value={addForm.studentNotes} onChange={(e) => setAddForm({ ...addForm, studentNotes: e.target.value })} placeholder="Any special instructions..." />
              </div>
              <div className="col-span-2 space-y-2"><Label>File</Label>
                <div className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-4 text-sm text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                  onClick={() => addFileInputRef.current?.click()}>
                  {addFile ? (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2"><File className="h-5 w-5 text-blue-500" /><span className="text-sm">{addFile.name}</span></div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setAddFile(null); setAddFileError(null) }} className="text-neutral-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1"><Upload className="h-6 w-6 text-neutral-400" /><p>Click to attach a file</p></div>
                  )}
                </div>
                <input ref={addFileInputRef} type="file" accept={acceptedExtensions.map(e => `.${e}`).join(',')} className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) { setAddFile(null); setAddFileError(null); return }
                    const ext = f.name.split('.').pop()?.toLowerCase()
                    if (!ext || !acceptedExtensions.includes(ext)) { setAddFileError(`Accepted types: ${acceptedExtensions.map(e => `.${e}`).join(', ')}`); setAddFile(null); return }
                    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setAddFileError(`Max file size is ${MAX_FILE_SIZE_MB} MB`); setAddFile(null); return }
                    setAddFile(f); setAddFileError(null)
                  }} />
                {addFileError && <p className="text-sm text-red-600">{addFileError}</p>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAddJob} disabled={adding || !addForm.title || !addForm.studentName || !addForm.studentEmail}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Job
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
        )}

        <div className="flex flex-wrap gap-4">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="ALL">ALL</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-neutral-800 text-left">
                <th className="h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none" onClick={() => handleSort('student_name')}>
                  Name{sortField === 'student_name' && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
                <th className="h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none" onClick={() => handleSort('created_at')}>
                  Submitted{sortField === 'created_at' && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
                <th className="h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none" onClick={() => handleSort('status')}>
                  Status{sortField === 'status' && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
                <th className="h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none" onClick={() => handleSort('job_type')}>
                  Type{sortField === 'job_type' && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
                <th className="h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none" onClick={() => handleSort('printer')}>
                  Tool{sortField === 'printer' && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
                <th className="h-12 px-4 font-medium text-neutral-500"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No submissions found.</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <td className="px-4 py-3 font-medium">{item.title || item.student_name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(item.submitted_at || item.created_at)}</td>
                    <td className="px-4 py-3">
                      {item._isQueue ? (
                        <Badge variant="warning">RECEIVED</Badge>
                      ) : (
                        <Badge variant={statusColors[item.status] || 'default'}>{item.status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {item.job_type ? <Badge variant={jobTypeColors[item.job_type] || 'secondary'}>{item.job_type}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {item.printers?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Edit job" onClick={() => navigate(item._isQueue ? `/manage/queue/${item.id}` : `/manage/jobs/${item.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!item._isQueue && (
                          <Button variant="ghost" size="sm" title="View history" onClick={() => navigate(`/manage/jobs/${item.id}/history`)}>
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="w-20 h-8 text-xs">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span>{safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</Button>
                <Button variant="ghost" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
