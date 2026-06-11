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
  const [jobs, setJobs] = useState<any[] | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!email) return
    setSearched(true)
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('student_email', email)
      .order('created_at', { ascending: false })

    setJobs(data || [])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check the status of your print job(s)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Enter your email address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="jane@vt.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searched && jobs && jobs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-neutral-500">
            No jobs found for this email address.
          </CardContent>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Jobs ({jobs.length})</h2>
          {jobs.map((job) => (
            <Link key={job.id} to={`/status/${job.id}`}>
              <Card className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-neutral-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusColors[job.status] || 'default'}>
                    {job.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
