import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Search } from 'lucide-react'

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  RECEIVED: 'secondary',
  PENDING: 'warning',
  PRINTING: 'info',
  COMPLETE: 'success',
  FAILED: 'destructive',
  CANCELLED: 'default',
  AWAITING_CONFIRMATION: 'default',
}

export default function ManageJobs() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    loadJobs()
  }, [user])

  async function loadJobs() {
    let query = supabase
      .from('jobs')
      .select('*, printers(name)')
      .order('created_at', { ascending: false })

    const { data } = await query
    setJobs(data || [])
  }

  const filtered = jobs.filter((job) => {
    if (filter !== 'ALL' && job.status !== filter) return false
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
        !job.student_name.toLowerCase().includes(search.toLowerCase()) &&
        !job.student_email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statuses = [...new Set(jobs.map((j) => j.status))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Queue</h1>
        <p className="text-sm text-neutral-500">{filtered.length} jobs</p>
      </div>

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Printer</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-500 py-8">
                  No jobs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => (
                <TableRow key={job.id} className="cursor-pointer" onClick={() => window.location.href = `/manage/jobs/${job.id}`}>
                  <TableCell className="font-medium">{job.title}</TableCell>
                  <TableCell>
                    <div>
                      <p>{job.student_name}</p>
                      <p className="text-xs text-neutral-400">{job.student_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[job.status] || 'default'}>{job.status}</Badge>
                  </TableCell>
                  <TableCell>{job.printers?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {new Date(job.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
