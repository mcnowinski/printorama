import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Search } from 'lucide-react'

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

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  RECEIVED: 'secondary',
  PENDING: 'warning',
  PRINTING: 'info',
  COMPLETE: 'success',
  FAILED: 'destructive',
  CANCELLED: 'default',
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
      supabase.rpc('get_my_jobs', { p_email: email }),
    ])

    const mapped = [
      ...(queueResult.data || []).filter((q: any) => !q.job_id).map((q: any) => ({
        ...q,
        _status: 'PENDING',
        _statusKey: 'PENDING',
      })),
      ...(jobsResult.data || []).map((j: any) => ({
        ...j,
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
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.student_name}</p>
                  <Badge variant={statusColors[item._statusKey] || 'default'}>{item._status}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-neutral-500">
                  <p>Submitted: {fmt(item.submitted_at || item.created_at)}</p>
                  <p>Last modified: {fmt(item.updated_at || item.created_at)}</p>
                  {item.original_filename && (
                    <p>File: {item.original_filename}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
