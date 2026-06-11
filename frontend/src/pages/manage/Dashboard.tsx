import { useState, useEffect } from 'react'
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
import { Search, Settings, Users, Plus, Loader2 } from 'lucide-react'

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
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [statusOptions, setStatusOptions] = useState<{ label: string }[]>([])
  const [addForm, setAddForm] = useState({
    title: '', studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED',
  })

  useEffect(() => {
    loadJobs()
    supabase.from('dropdown_options').select('label').eq('category', 'JOB_STATUS').order('sort_order').then(({ data }) => {
      setStatusOptions(data || [])
    })
  }, [])

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*, printers(name, status)')
      .order('created_at', { ascending: false })

    setJobs(data || [])
  }

  async function handleAddJob() {
    if (!addForm.title.trim() || !addForm.studentName.trim() || !addForm.studentEmail.trim()) return
    setAdding(true)
    await supabase.from('jobs').insert({
      title: addForm.title.trim(),
      student_name: addForm.studentName.trim(),
      student_email: addForm.studentEmail.trim(),
      student_notes: addForm.studentNotes.trim() || null,
      status: addForm.status,
    })
    setAdding(false)
    setShowAddForm(false)
    setAddForm({ title: '', studentName: '', studentEmail: '', studentNotes: '', status: 'RECEIVED' })
    loadJobs()
  }

  const filtered = jobs.filter((job) => {
    if (filter !== 'ALL' && job.status !== filter) return false
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
        !job.student_name.toLowerCase().includes(search.toLowerCase()) &&
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
          <button
            onClick={() => navigate('/manage/users')}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <Users className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-medium text-sm">User Management</p>
              <p className="text-xs text-neutral-500">Invite and manage staff accounts</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/manage/settings')}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <Settings className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-medium text-sm">Settings</p>
              <p className="text-xs text-neutral-500">Printers, system config, dropdown lists</p>
            </div>
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Job Queue</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm text-neutral-500">{filtered.length} jobs</p>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Plus className="h-4 w-4" /> Add Job
            </button>
          </div>
        </div>

        {showAddForm && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    placeholder="My 3D Print"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
                    {statusOptions.map((s) => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input
                    value={addForm.studentName}
                    onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Student Email</Label>
                  <Input
                    value={addForm.studentEmail}
                    onChange={(e) => setAddForm({ ...addForm, studentEmail: e.target.value })}
                    placeholder="jane@vt.edu"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={addForm.studentNotes}
                    onChange={(e) => setAddForm({ ...addForm, studentNotes: e.target.value })}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleAddJob} disabled={adding || !addForm.title || !addForm.studentName || !addForm.studentEmail}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Job
                </Button>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
              <option value="ALL">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search jobs..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-neutral-800 text-left">
                <th className="h-12 px-4 font-medium text-neutral-500">Title</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Student</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Status</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Printer</th>
                <th className="h-12 px-4 font-medium text-neutral-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No jobs found.</td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer border-b dark:border-neutral-800 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    onClick={() => navigate(`/manage/jobs/${job.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{job.title}</td>
                    <td className="px-4 py-3">
                      <p>{job.student_name}</p>
                      <p className="text-xs text-neutral-400">{job.student_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[job.status] || 'default'}>{job.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {job.printers ? (
                        <span className={job.printers.status === 'OFFLINE' ? 'text-neutral-300 dark:text-neutral-700' : ''}>
                          {job.printers.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
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
