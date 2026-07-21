import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Search, Loader2, ArrowLeft, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { statusColors, jobTypeColors } from '../lib/colors'

function fmt(d: string) {
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

export default function Status() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlEmail = searchParams.get('email') || ''
  const [email, setEmail] = useState(urlEmail)
  const [items, setItems] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    if (urlEmail) handleSearch()
  }, [])

  async function handleSearch() {
    if (!email) return
    setSearched(true)
    setSearching(true)

    const [queueResult, jobsResult] = await Promise.all([
      supabase.rpc('get_my_queue_items', { p_email: email }),
      supabase.rpc('get_my_jobs', { p_email: email }),
    ])

    const mapped = [
      ...(queueResult.data || []).filter((q: any) => !q.job_id).map((q: any) => ({
        ...q,
        _status: 'RECEIVED',
        _statusKey: 'RECEIVED',
      })),
      ...(jobsResult.data || []).map((j: any) => ({
        ...j,
        _status: j.status,
        _statusKey: j.status,
      })),
    ]
    setItems(mapped)
    setSearching(false)
    setPage(0)
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

  const sorted = [...items].sort((a, b) => {
    let cmp = 0
    if (sortField === 'title') cmp = (a.title || a.student_name).localeCompare(b.title || b.student_name)
    else if (sortField === 'status') cmp = a._status.localeCompare(b._status)
    else if (sortField === 'modified') {
      cmp = new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime()
    } else {
      cmp = new Date(a.submitted_at || a.created_at).getTime() - new Date(b.submitted_at || b.created_at).getTime()
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedItems = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <CardTitle>Check Job Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Enter your email address</Label>
            <div className="flex gap-2">
              <Input id="email" type="email" placeholder="jane@doe.com" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch}><Search className="mr-2 h-4 w-4" /> Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searching && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      )}

      {searched && !searching && items.length === 0 && (
        <Card><CardContent className="py-8 text-center text-neutral-500">No jobs found for this email address.</CardContent></Card>
      )}

      {items.length > 0 && !searching && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Jobs ({sorted.length})</h2>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-neutral-800 text-left">
                  {['title', 'created_at', 'modified', 'status', 'job_type'].map((field) => (
                    <th key={field} className={'h-12 px-4 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none whitespace-nowrap' + (field === 'created_at' || field === 'modified' ? ' hidden sm:table-cell' : '') + (field === 'job_type' ? ' hidden md:table-cell' : '')} onClick={() => handleSort(field)}>
                      {field === 'title' ? 'Job' : field === 'created_at' ? 'Submitted' : field === 'modified' ? 'Last Modified' : field === 'status' ? 'Status' : 'Type'}
                      {sortField === field && <span className="ml-1 text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                  ))}
                  <th className="h-12 px-4 font-medium text-neutral-500 whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{item.title || item.student_name}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 whitespace-nowrap hidden sm:table-cell">{fmt(item.submitted_at || item.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 whitespace-nowrap hidden sm:table-cell">{fmt(item.updated_at || item.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusColors[item._statusKey] || 'default'}>{item._status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{item.job_type ? <Badge variant={jobTypeColors[item.job_type] || 'secondary'}>{item.job_type}</Badge> : <span className="text-sm text-neutral-500">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button variant="ghost" size="sm" title="View history" onClick={() => navigate(`/status/${item.id}?email=${encodeURIComponent(email)}`)}>
                          <Clock className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {sorted.length > pageSize && (
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="w-20 h-8 text-xs">
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span>{safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</Button>
                  <Button variant="ghost" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
