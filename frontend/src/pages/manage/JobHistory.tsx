import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'

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
  printer: 'Printer',
  notes: 'Notes',
}

export default function JobHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('jobs').select('title, student_name, student_email, status').eq('id', id).single(),
      supabase.from('job_history').select('*').eq('job_id', id).order('created_at', { ascending: true }),
    ]).then(([jobRes, histRes]) => {
      setJob(jobRes.data)
      setHistory(histRes.data || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-neutral-400" /></div>
  if (!job) return <div className="py-24 text-center text-neutral-500">Job not found.</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate('/manage')} className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{job.title || 'Job'}</CardTitle>
          <p className="text-sm text-neutral-500">{job.student_name} &lt;{job.student_email}&gt; — {job.status}</p>
        </CardHeader>
      </Card>

      {history.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-neutral-500">No history yet.</CardContent></Card>
      ) : (
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
                      <span className="font-medium">{fieldLabels[h.field] || h.field}</span>
                      {' changed from '}
                      <span className="text-neutral-500">{h.old_value || '(empty)'}</span>
                      {' to '}
                      <span className="text-neutral-500">{h.new_value || '(empty)'}</span>
                    </p>
                    <p className="text-xs text-neutral-400">{fmt(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
