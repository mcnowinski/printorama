import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Loader2, Pencil, Trash2, Plus } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/dialog'
import { downloadFile } from '../../lib/download'

function fmt(d: string) {
  const date = new Date(d)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export default function ManageJobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [printers, setPrinters] = useState<any[]>([])
  const [statuses, setStatuses] = useState<{ label: string }[]>([])
  const [jobTypes, setJobTypes] = useState<{ label: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState('')
  const [jobType, setJobType] = useState('')
  const [printerId, setPrinterId] = useState('')
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [confirmNoteDel, setConfirmNoteDel] = useState<{ show: boolean; id: string; content: string }>({ show: false, id: '', content: '' })

  useEffect(() => {
    if (!id) return

    supabase.from('jobs').select('*, printers(name)').eq('id', id).single().then(({ data }) => {
      if (data) {
        setJob(data)
        setStatus(data.status)
        setJobType(data.job_type || '')
        setPrinterId(data.printer_id || '')
      }
    })

    loadNotes()
    loadPrinters()
    loadStatuses()
    supabase.from('dropdown_options').select('label').eq('category', 'JOB_TYPE').order('sort_order').then(({ data }) => {
      setJobTypes(data || [])
    })
    loadJobTypes()
  }, [id])

  async function loadNotes() {
    if (!id) return
    const { data } = await supabase.from('job_notes').select('*').eq('job_id', id).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function loadPrinters() {
    const { data } = await supabase.from('printers').select('*').order('name')
    setPrinters(data || [])
  }

  async function loadStatuses() {
    const { data } = await supabase.from('dropdown_options').select('label').eq('category', 'JOB_STATUS').order('sort_order')
    setStatuses(data || [])
  }

  async function loadJobTypes() {
    const { data } = await supabase.from('dropdown_options').select('label').eq('category', 'JOB_TYPE').order('sort_order')
    setJobTypes(data || [])
  }

  async function handleSave() {
    if (!id) return
    setSaving(true)

    const oldStatus = job.status
    const oldPrinterId = job.printer_id
    const { error } = await supabase
      .from('jobs')
      .update({ status, job_type: jobType || null, printer_id: printerId || null })
      .eq('id', id)

    if (error) { console.error('Job update failed:', error); setSaving(false); return }

    const historyInserts: any[] = []

    if (status !== oldStatus) {
      historyInserts.push({ job_id: id, field: 'status', old_value: oldStatus, new_value: status })
      await supabase.from('notifications').insert({
        job_id: id, recipient: job.student_email,
        type: 'STATUS_CHANGE',
        message: `Print job from ${job.student_name} status changed from ${oldStatus} to ${status}.`,
      })
    }

    if (String(printerId) !== String(oldPrinterId || '')) {
      const oldName = printers.find((p) => p.id === oldPrinterId)?.name || oldPrinterId
      const newName = printers.find((p) => p.id === printerId)?.name || printerId
      historyInserts.push({ job_id: id, field: 'printer', old_value: oldName || 'Unassigned', new_value: newName || 'Unassigned' })
    }

    if (historyInserts.length > 0) {
      const { error: histError } = await supabase.from('job_history').insert(historyInserts)
      if (histError) console.error('History insert failed:', histError)
    }

    setSaving(false)
    navigate('/manage')
  }

  async function handleAddNote() {
    if (!id || !newNote.trim()) return
    setAddingNote(true)
    const { error } = await supabase.from('job_notes').insert({ job_id: id, content: newNote.trim() })
    if (!error) {
      await supabase.from('job_history').insert({ job_id: id, field: 'notes', old_value: null, new_value: newNote.trim() })
      setNewNote('')
      loadNotes()
    }
    setAddingNote(false)
  }

  async function handleSaveNote(noteId: string, oldContent: string) {
    if (!editNoteContent.trim()) return
    await supabase.from('job_notes').update({ content: editNoteContent.trim() }).eq('id', noteId)
    await supabase.from('job_history').insert({ job_id: id, field: 'notes', old_value: oldContent, new_value: editNoteContent.trim() })
    setEditNoteId(null)
    loadNotes()
  }

  async function handleDeleteNote(noteId: string, content: string) {
    setConfirmNoteDel({ show: true, id: noteId, content })
  }

  async function execDeleteNote() {
    await supabase.from('job_notes').delete().eq('id', confirmNoteDel.id)
    await supabase.from('job_history').insert({ job_id: id, field: 'notes', old_value: confirmNoteDel.content, new_value: null })
    loadNotes()
  }

  if (!job) return <div className="py-24 text-center text-neutral-500">Loading...</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate('/manage')} className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
      </button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{job.title || 'Job'}</CardTitle>
            <p className="text-sm text-neutral-500">{job.student_name} &lt;{job.student_email}&gt;</p>
          </div>
          {/* <Badge variant={statusColors[job.status] || 'default'}>{job.status}</Badge> */}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium text-neutral-500">Submitted:</span> {new Date(job.created_at).toLocaleString()}</div>
            <div><span className="font-medium text-neutral-500">Updated:</span> {new Date(job.updated_at).toLocaleString()}</div>
            {job.largest_dimension && <div><span className="font-medium text-neutral-500">Dimension:</span> {job.largest_dimension} {job.dimension_unit || 'mm'}</div>}
            {job.file_url && <div className="col-span-2"><span className="font-medium text-neutral-500">File:</span> <button onClick={() => downloadFile(job.file_url, job.title || job.student_name, job.student_name, job.submitted_at || job.created_at)} className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 cursor-pointer">Download</button></div>}
            {job.student_notes && <div className="col-span-2"><span className="font-medium text-neutral-500">Instructions:</span><p className="mt-1 text-neutral-600">{job.student_notes}</p></div>}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.filter((s) => s.label !== 'PENDING' && s.label !== 'RECEIVED').map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">Select type...</option>
              {jobTypes.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tool</Label>
            <Select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
              <option value="">Unassigned</option>
              {printers.filter((p) => p.status === 'ONLINE').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Notes</Label>
            <div className="space-y-2">
              {notes.length === 0 && <p className="text-sm text-neutral-400">No notes yet.</p>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  {editNoteId === n.id ? (
                    <div className="space-y-2">
                      <Textarea value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} className="min-h-[60px]" />
                      <div className="flex gap-1">
                        <Button size="sm" className="text-xs" onClick={() => handleSaveNote(n.id, n.content)}>Save</Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditNoteId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{n.content}</p>
                        <p className="mt-1 text-xs text-neutral-400">{fmt(n.created_at)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" title="Edit note" onClick={() => { setEditNoteId(n.id); setEditNoteContent(n.content) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Delete note" onClick={() => handleDeleteNote(n.id, n.content)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[60px]"
              />
              <Button variant="outline" size="sm" className="self-end" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmNoteDel.show}
        onClose={() => setConfirmNoteDel({ show: false, id: '', content: '' })}
        onConfirm={execDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        confirmLabel="Delete"
      />
    </div>
  )
}
