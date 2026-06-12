import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Link } from 'react-router-dom'
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

export default function Status() {
  const [email, setEmail] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!email) return
    setSearched(true)

    const [queueResult, jobsResult] = await Promise.all([
      supabase.rpc('get_my_queue_items', { p_email: email }),
      supabase.from('jobs').select('*').eq('student_email', email).order('created_at', { ascending: false }),
    ])

    const mapped = [
      ...(queueResult.data || []).map((q: any) => ({
        ...q,
        _type: 'queue' as const,
        _status: q.status === 'PENDING' ? 'PENDING' : q.status === 'APPROVED' ? 'Approved' : 'Not Accepted',
        _statusKey: q.status === 'PENDING' ? 'PENDING' : q.status === 'APPROVED' ? 'RECEIVED' : 'CANCELLED',
      })),
      ...(jobsResult.data || []).map((j: any) => ({
        ...j,
        _type: 'job' as const,
        _status: j.status,
        _statusKey: j.status,
      })),
    ]

    mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setItems(mapped)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check Your Job Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Enter your email address</Label>
            <div className="flex gap-2">
              <Input id="email" type="email" placeholder="jane@vt.edu" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch}><Search className="mr-2 h-4 w-4" /> Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searched && items.length === 0 && (
        <Card><CardContent className="py-8 text-center text-neutral-500">No submissions found for this email address.</CardContent></Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Submissions ({items.length})</h2>
          {items.map((item) => (
            item._type === 'queue' && item.status === 'PENDING' ? (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{item.student_name}</p>
                    <p className="text-sm text-neutral-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline dark:text-blue-400">View file</a>
                    )}
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </CardContent>
              </Card>
            ) : item._type === 'queue' && item.status === 'REJECTED' ? (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{item.student_name}</p>
                    <p className="text-sm text-neutral-500">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="destructive">Not Accepted</Badge>
                </CardContent>
              </Card>
            ) : (
              <Link key={item.id} to={`/status/${item.job_id || item.id}`}>
                <Card className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{item.student_name}</p>
                      <p className="text-sm text-neutral-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={statusColors[item._statusKey] || 'default'}>{item._status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  )
}
