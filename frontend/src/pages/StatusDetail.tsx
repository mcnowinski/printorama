import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { statusColors } from '../lib/colors'

function fmt(d: string) {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  let hh = date.getHours()
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12 || 12
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${mi} ${ampm}`
}

const fieldLabels: Record<string, string> = {
  status: 'Status',
  printer: 'Tool',
  notes: 'Notes',
}

export default function StatusDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [job, setJob] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function load() {
      if (email) {
        const { data: jobs } = await supabase.rpc('get_my_jobs', { p_email: email })
        const found = (jobs || []).find((j: any) => j.id === id)
        if (found) {
          setJob(found)
        } else {
          const { data: queueItems } = await supabase.rpc('get_my_queue_items', { p_email: email })
          const queued = (queueItems || []).find((q: any) => q.id === id)
          if (queued) setJob({ ...queued, status: 'PENDING' })
        }
      } else {
        const { data } = await supabase.from('jobs').select('*, printers!left(name)').eq('id', id).single()
        setJob(data)
      }

      const { data: h } = await supabase.rpc('get_my_job_history', { p_email: email })
      if (h) setHistory(h.filter((entry: any) => entry.job_id === id))
      const { data: n } = await supabase.rpc('get_my_job_notes', { p_email: email })
      if (n) setNotes(n.filter((note: any) => note.job_id === id))

      setLoading(false)
    }
    load()
  }, [id, email])

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
      {email ? (
        <Link to={`/status?email=${encodeURIComponent(email)}`} className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to my jobs
        </Link>
      ) : (
        <a href="/status" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to my jobs
        </a>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{job.title || 'Job Details'}</CardTitle>
            <p className="text-sm text-neutral-500">{job.student_name} &lt;{job.student_email}&gt;</p>
          </div>
          <Badge variant={statusColors[job.status] || 'default'} className="text-sm">
            {job.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-500">Submitted:</span>{' '}
              {new Date(job.submitted_at || job.created_at).toLocaleString()}
            </div>
            {job.printers?.name && (
              <div>
                <span className="font-medium text-neutral-500">Tool:</span> {job.printers.name}
              </div>
            )}
            {job.largest_dimension && (
              <div>
                <span className="font-medium text-neutral-500">Max. Dimension:</span>{' '}
                {job.largest_dimension} {job.dimension_unit || 'mm'}
              </div>
            )}
            {/* {job.file_url && (
              <div className="col-span-2">
                <span className="font-medium text-neutral-500">File:</span>{' '}
                <a href={job.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">Download</a>
              </div>
            )} */}
          </div>
          {notes.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-sm font-medium text-neutral-500">Instructions</p>
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="text-sm">{n.content}</p>
                  <p className="mt-1 text-xs text-neutral-400">{fmt(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-0">
              {history.map((h, i) => (
                <div key={h.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    {i < history.length - 1 && <div className="mt-1 w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm">
                      {h.field === 'notes' && h.new_value === null ? (
                        <>Notes deleted: <span className="text-neutral-500">{h.old_value}</span></>
                      ) : h.field === 'notes' && (!h.old_value || h.old_value === '(empty)') && h.new_value ? (
                        <>Note added: <span className="text-neutral-500">{h.new_value}</span></>
                      ) : (
                        <><span className="font-medium">{fieldLabels[h.field] || h.field}</span>
                        {' changed from '}
                        <span className="text-neutral-500">{h.old_value || '(empty)'}</span>
                        {' to '}
                        <span className="text-neutral-500">{h.new_value || '(empty)'}</span></>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400">{fmt(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : job.status === 'PENDING' ? (
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Job is pending review.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
