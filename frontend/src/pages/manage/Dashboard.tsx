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
import { Search, Settings, Users, Plus, Loader2, Upload, File, X, Check, XCircle } from 'lucide-react'

const MAX_FILE_SIZE_MB = 50

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  RECEIVED: 'secondary',
  PENDING: 'warning',
  PRINTING: 'info',
  COMPLETE: 'success',
  FAILED: 'destructive',
  CANCELLED: 'default',
  AWAITING_CONFIRMATION: 'default',
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
  const [statusOptions, setStatusOptions] = useState<{ label: string }[]>([])
  const [acceptedExtensions, setAcceptedExtensions] = useState<string[]>([])
  const [addFile, setAddFile] = useState<File | null>(null)
  const [addFileError, setAddFileError] = useState<string | null>(null)
  const addFileInputRef = useRef<HTMLInputElement>(null)
  const [addForm, setAddForm] = useState({
    studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED',
  })
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveStatus, setApproveStatus] = useState('RECEIVED')
  const [approvePrinter, setApprovePrinter] = useState('')
  const [printers, setPrinters] = useState<any[]>([])

  useEffect(() => {
    loadJobs()
    loadQueue()
    supabase.from('dropdown_options').select('label').eq('category', 'JOB_STATUS').order('sort_order').then(({ data }) => {
      setStatusOptions(data || [])
    })
    supabase.from('dropdown_options').select('label').eq('category', 'ACCEPTED_FILE_TYPE').order('sort_order').then(({ data }) => {
      setAcceptedExtensions((data || []).map((d: any) => d.label))
    })
    supabase.from('printers').select('*').order('name').then(({ data }) => {
      setPrinters(data || [])
    })
  }, [])

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*, printers(name, status)')
      .order('created_at', { ascending: false })
    setJobs(data || [])
  }

  async function loadQueue() {
    const { data } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
    setQueue(data || [])
  }

  async function handleAddJob() {
    if (!addForm.studentName.trim() || !addForm.studentEmail.trim()) return
    setAdding(true)

    let fileUrl: string | null = null
    if (addFile) {
      const fileExt = addFile.name.split('.').pop()
      const filePath = `${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('job-files').upload(filePath, addFile)
      if (uploadError) {
        console.error(uploadError)
        setAdding(false)
        return
      }
      const { data: urlData } = supabase.storage.from('job-files').getPublicUrl(filePath)
      fileUrl = urlData.publicUrl
    }

    await supabase.from('jobs').insert({
      student_name: addForm.studentName.trim(),
      student_email: addForm.studentEmail.trim(),
      student_notes: addForm.studentNotes.trim() || null,
      status: addForm.status,
      file_url: fileUrl,
    })
    setAdding(false)
    setShowAddForm(false)
    setAddFile(null)
    setAddFileError(null)
    setAddForm({ studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED' })
    loadJobs()
  }

  async function handleApprove(queueItem: any) {
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        student_name: queueItem.student_name,
        student_email: queueItem.student_email,
        student_notes: queueItem.student_notes,
        file_url: queueItem.file_url,
        status: approveStatus,
        printer_id: approvePrinter || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Approve failed:', error.message || error)
      return
    }

    await supabase
      .from('job_queue')
      .update({ status: 'APPROVED', job_id: job.id })
      .eq('id', queueItem.id)

    setApprovingId(null)
    setApproveStatus('RECEIVED')
    setApprovePrinter('')
    loadJobs()
    loadQueue()
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this submission?')) return
    await supabase.from('job_queue').update({ status: 'REJECTED' }).eq('id', id)
    loadQueue()
  }

  const filtered = jobs.filter((job) => {
    if (filter !== 'ALL' && job.status !== filter) return false
    if (search && !job.student_name.toLowerCase().includes(search.toLowerCase()) &&
        !job.student_email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statuses = [...new Set(jobs.map((j) => j.status))]
  const isAdmin = profile?.role === 'ADMINISTRATOR'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          {isAdmin ? 'Administrator' : 'Manager'} — {profile?.name}
        </p>
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
            <div><p className="font-medium text-sm">Settings</p><p className="text-xs text-neutral-500">Printers, system config, dropdown lists</p></div>
          </button>
        </div>
      )}

      {queue.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pending Review ({queue.length})</h2>
          <div className="space-y-3">
            {queue.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-neutral-500">Student:</span> {item.student_name}</div>
                    <div><span className="font-medium text-neutral-500">Email:</span> {item.student_email}</div>
                    {item.student_notes && (
                      <div className="col-span-2"><span className="font-medium text-neutral-500">Notes:</span> {item.student_notes}</div>
                    )}
                    {item.file_url && (
                      <div className="col-span-2">
                        <span className="font-medium text-neutral-500">File:</span>{' '}
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">Download</a>
                      </div>
                    )}
                    <div><span className="font-medium text-neutral-500">Submitted:</span> {new Date(item.created_at).toLocaleString()}</div>
                  </div>

                  {approvingId === item.id ? (
                    <div className="mt-4 space-y-3 rounded-lg border p-4">
                      <p className="text-sm font-medium">Approve as:</p>
                      <div className="flex gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Status</Label>
                          <Select value={approveStatus} onChange={(e) => setApproveStatus(e.target.value)} className="w-40">
                            {statusOptions.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Printer</Label>
                          <Select value={approvePrinter} onChange={(e) => setApprovePrinter(e.target.value)} className="w-48">
                            <option value="">Unassigned</option>
                            {printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(item)}><Check className="mr-1 h-4 w-4" /> Confirm</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setApprovingId(null); setApproveStatus('RECEIVED'); setApprovePrinter('') }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={() => { setApprovingId(item.id); setApproveStatus('RECEIVED'); setApprovePrinter('') }}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReject(item.id)}>
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Job Queue</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm text-neutral-500">{filtered.length} jobs</p>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              <Plus className="h-4 w-4" /> Add Job
            </button>
          </div>
        </div>

        {showAddForm && (
          <Card><CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
                  {statusOptions.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2"><Label>Student Name</Label>
                <Input value={addForm.studentName} onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2"><Label>Student Email</Label>
                <Input value={addForm.studentEmail} onChange={(e) => setAddForm({ ...addForm, studentEmail: e.target.value })} placeholder="jane@vt.edu" />
              </div>
              <div className="col-span-2 space-y-2"><Label>Notes</Label>
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
              <Button onClick={handleAddJob} disabled={adding || !addForm.studentName || !addForm.studentEmail}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Job
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
        )}

        <div className="flex flex-wrap gap-4">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="ALL">All Statuses</option>
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
                <th className="h-12 px-4 font-medium text-neutral-500">Student</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Email</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Status</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Printer</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No jobs found.</td></tr>
              ) : (
                filtered.map((job) => (
                  <tr key={job.id} className="cursor-pointer border-b dark:border-neutral-800 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    onClick={() => navigate(`/manage/jobs/${job.id}`)}>
                    <td className="px-4 py-3 font-medium">{job.student_name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{job.student_email}</td>
                    <td className="px-4 py-3"><Badge variant={statusColors[job.status] || 'default'}>{job.status}</Badge></td>
                    <td className="px-4 py-3">
                      {job.printers ? (
                        <span className={job.printers.status === 'OFFLINE' ? 'text-neutral-300 dark:text-neutral-700' : ''}>{job.printers.name}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
