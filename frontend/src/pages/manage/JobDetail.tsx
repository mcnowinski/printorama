import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function ManageJobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [printers, setPrinters] = useState<any[]>([])
  const [statuses, setStatuses] = useState<{ label: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState('')
  const [printerId, setPrinterId] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (!id) return

    supabase.from('jobs').select('*, printers(name)').eq('id', id).single().then(({ data }) => {
      if (data) {
        setJob(data)
        setStatus(data.status)
        setPrinterId(data.printer_id || '')
        setAdminNotes(data.admin_notes || '')
      }
    })

    supabase.from('printers').select('*').order('name').then(({ data }) => {
      setPrinters(data || [])
    })

    supabase.from('dropdown_options').select('label').eq('category', 'JOB_STATUS').order('sort_order').then(({ data }) => {
      setStatuses(data || [])
    })
  }, [id])

  async function handleSave() {
    if (!id) return
    setSaving(true)

    const oldStatus = job.status
    const { error } = await supabase
      .from('jobs')
      .update({ status, printer_id: printerId || null, admin_notes: adminNotes || null })
      .eq('id', id)

    if (!error && status !== oldStatus) {
      await supabase.from('notifications').insert({
        job_id: id,
        recipient: job.student_email,
        type: 'STATUS_CHANGE',
        message: `Print job from ${job.student_name} status changed from ${oldStatus} to ${status}.`,
      })
    }

    setSaving(false)
    navigate('/manage')
  }

  if (!job) return <div className="py-12 text-center text-neutral-500">Loading...</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate('/manage')} className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Job List
      </button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Job for {job.student_name}</CardTitle>
            <p className="text-sm text-neutral-500">{job.student_email}</p>
          </div>
          {/* <Badge variant={statusColors[job.status] || 'default'} className="text-sm">
            {job.status}
          </Badge> */}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-500">Submitted:</span>{' '}
              {new Date(job.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium text-neutral-500">Updated:</span>{' '}
              {new Date(job.updated_at).toLocaleString()}
            </div>
            {job.filament_type && (
              <div>
                <span className="font-medium text-neutral-500">Filament:</span>{' '}
                {job.filament_type}{job.filament_color ? ` (${job.filament_color})` : ''}
              </div>
            )}
            {job.largest_dimension && (
              <div>
                <span className="font-medium text-neutral-500">Max. Dimension:</span>{' '}
                {job.largest_dimension} {job.dimension_unit || 'mm'}
              </div>
            )}
            {job.file_url && (
              <div className="col-span-2">
                <span className="font-medium text-neutral-500">File:</span>{' '}
                <a href={job.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                  Download {job.file_url.split('/').pop()?.split('.').pop()?.toUpperCase() || 'file'}
                </a>
              </div>
            )}
            {job.student_notes && (
              <div className="col-span-2">
                <span className="font-medium text-neutral-500">Student Notes:</span>
                <p className="mt-1 text-neutral-600">{job.student_notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Printer</Label>
            <Select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
              <option value="">Unassigned</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id} className={p.status === 'OFFLINE' ? 'text-neutral-400' : ''}>
                  {p.name}{p.status === 'OFFLINE' ? ' (offline)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Staff Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this job..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
                      </div>
        </CardContent>
      </Card>
    </div>
  )
}
