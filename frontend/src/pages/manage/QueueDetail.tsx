import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function QueueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusOptions, setStatusOptions] = useState<{ label: string }[]>([])
  const [printers, setPrinters] = useState<any[]>([])
  const [approveStatus, setApproveStatus] = useState('RECEIVED')
  const [approvePrinter, setApprovePrinter] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('job_queue').select('*').eq('id', id).single(),
      supabase.from('dropdown_options').select('label').eq('category', 'JOB_STATUS').order('sort_order'),
      supabase.from('printers').select('*').order('name'),
    ]).then(([itemResult, statusResult, printersResult]) => {
      setItem(itemResult.data || null)
      setStatusOptions(statusResult.data || [])
      setPrinters(printersResult.data || [])
      setLoading(false)
    })
  }, [id])

  async function handleApprove() {
    if (!id || !item) return
    setSaving(true)
    const { error } = await supabase
      .from('jobs')
      .insert({
        title: item.title || '',
        student_name: item.student_name,
        student_email: item.student_email,
        student_notes: item.student_notes,
        file_url: item.file_url,
        largest_dimension: item.largest_dimension,
        dimension_unit: item.dimension_unit || 'mm',
        submitted_at: item.created_at,
        status: approveStatus,
        printer_id: approvePrinter || null,
      })
      .select('id')
      .single()

    if (error) { console.error('Job insert failed:', error); setSaving(false); return }

    const { error: deleteError } = await supabase.from('job_queue').delete().eq('id', id)
    if (deleteError) { console.error('Queue delete failed:', deleteError); setSaving(false); return }
    setSaving(false)
    navigate('/manage')
  }

  if (loading) return <div className="py-24 text-center text-neutral-500">Loading...</div>
  if (!item) return <div className="py-24 text-center text-neutral-500">Submission not found.</div>

  const isPending = item.status === 'PENDING'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate('/manage')} className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
      </button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{item.title || item.student_name}</CardTitle>
            <p className="text-sm text-neutral-500">{item.student_name} &lt;{item.student_email}&gt;</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-500">Submitted:</span>{' '}
              {new Date(item.created_at).toLocaleString()}
            </div>
            {item.largest_dimension && (
              <div>
                <span className="font-medium text-neutral-500">Max. Dimension:</span>{' '}
                {item.largest_dimension} {item.dimension_unit || 'mm'}
              </div>
            )}
          </div>

          {item.student_notes && (
            <div>
              <p className="text-sm font-medium text-neutral-500">Notes</p>
              <p className="mt-1 text-sm text-neutral-600">{item.student_notes}</p>
            </div>
          )}

          {item.file_url && (
            <div>
              <p className="text-sm font-medium text-neutral-500">File</p>
              <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                {item.original_filename || item.file_url.split('/').pop()}
              </a>
            </div>
          )}

          {isPending && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={approveStatus} onChange={(e) => setApproveStatus(e.target.value)} className="w-40">
                  {statusOptions.filter((s) => s.label !== 'PENDING').map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Printer</Label>
                <Select value={approvePrinter} onChange={(e) => setApprovePrinter(e.target.value)} className="w-48">
                  <option value="">Unassigned</option>
                  {printers.map((p) => <option key={p.id} value={p.id} className={p.status === 'OFFLINE' ? 'text-neutral-400' : ''}>{p.name}{p.status === 'OFFLINE' ? ' (offline)' : ''}</option>)}
                </Select>
              </div>
              <Button onClick={handleApprove} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          )}

          {item.job_id && (
            <div className="border-t pt-4">
              <Button variant="outline" onClick={() => navigate(`/manage/jobs/${item.job_id}`)}>
                View Job
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
