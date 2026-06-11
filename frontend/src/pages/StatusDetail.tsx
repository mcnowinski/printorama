import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ArrowLeft } from 'lucide-react'

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  RECEIVED: 'secondary',
  PENDING: 'warning',
  PRINTING: 'info',
  COMPLETE: 'success',
  FAILED: 'destructive',
  CANCELLED: 'default',
  AWAITING_CONFIRMATION: 'default',
}

export default function StatusDetail() {
  const { id } = useParams()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('jobs').select('*, printers!left(name)').eq('id', id).single().then(({ data }) => {
      setJob(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <div className="py-12 text-center text-neutral-500">Loading...</div>
  }

  if (!job) {
    return (
      <Card className="mx-auto max-w-lg mt-12">
        <CardContent className="py-8 text-center text-neutral-500">
          Job not found.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/status" className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to my jobs
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Job Details</CardTitle>
            <p className="text-sm text-neutral-500">Submitted by {job.student_name}</p>
          </div>
          <Badge variant={statusColors[job.status] || 'default'} className="text-sm">
            {job.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">Submitted</p>
              <p>{new Date(job.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Last Updated</p>
              <p>{new Date(job.updated_at).toLocaleString()}</p>
            </div>
            {job.filament_type && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Filament</p>
                <p>{job.filament_type}{job.filament_color ? ` (${job.filament_color})` : ''}</p>
              </div>
            )}
            {job.printers && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Assigned Printer</p>
                <p>{job.printers?.name || 'Not yet assigned'}</p>
              </div>
            )}
            {job.file_url && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-neutral-500">File</p>
                <a href={job.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                  Download {job.file_url.split('/').pop()?.split('.').pop()?.toUpperCase() || 'file'}
                </a>
              </div>
            )}
          </div>
          {job.student_notes && (
            <div>
              <p className="text-sm font-medium text-neutral-500">Your Notes</p>
              <p className="text-sm text-neutral-600">{job.student_notes}</p>
            </div>
          )}
          {job.admin_notes && (
            <div>
              <p className="text-sm font-medium text-neutral-500">Staff Notes</p>
              <p className="text-sm text-neutral-600">{job.admin_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
