import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Loader2, Upload, File, X } from 'lucide-react'

const MAX_FILE_SIZE_MB = 50

export default function Request() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(true)
  const [acceptedExtensions, setAcceptedExtensions] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const [form, setForm] = useState({
    studentName: '',
    studentEmail: '',
    studentNotes: '',
  })

  useEffect(() => {
    supabase.from('system_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) setRequestsOpen(data.requests_open)
    })

    supabase.from('dropdown_options').select('label').eq('category', 'ACCEPTED_FILE_TYPE').order('sort_order').then(({ data }) => {
      setAcceptedExtensions((data || []).map((d: any) => d.label))
    })
  }, [])

  function validateFile(f: File): string | null {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!ext || !acceptedExtensions.includes(ext)) {
      return `File type .${ext || 'unknown'} is not accepted. Accepted types: ${acceptedExtensions.map(e => `.${e}`).join(', ')}`
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`
    }
    return null
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) {
      setFile(null)
      setFileError(null)
      return
    }
    const f = files[0]
    const err = validateFile(f)
    if (err) {
      setFile(null)
      setFileError(err)
      return
    }
    setFile(f)
    setFileError(null)
  }

  function removeFile() {
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let fileUrl: string | null = null

    if (file) {
      const fileExt = file.name.split('.').pop()
      const filePath = `${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('job-files')
        .upload(filePath, file)

      if (uploadError) {
        console.error(uploadError)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('job-files')
        .getPublicUrl(filePath)

      fileUrl = urlData.publicUrl
    }

    const { error } = await supabase
      .from('job_queue')
      .insert({
        student_name: form.studentName,
        student_email: form.studentEmail,
        student_notes: form.studentNotes || null,
        file_url: fileUrl,
        status: 'PENDING',
      })

    if (error) {
      console.error('Queue insert failed:', error.message || error)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  const acceptString = acceptedExtensions.map(e => `.${e}`).join(',')

  if (!requestsOpen) {
    return (
      <Card className="mx-auto max-w-lg mt-12">
        <CardHeader>
          <CardTitle>Submissions Closed</CardTitle>
          <CardDescription>
            Job submissions are currently closed. Please check back later.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg mt-12">
        <CardHeader>
          <CardTitle>Job Submitted!</CardTitle>
          <CardDescription>
            Your print job request has been submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            Your request is now in the queue. Staff will review it and
            you'll receive updates at <strong>{form.studentEmail}</strong>.
          </p>
          {file && (
            <p className="text-sm text-neutral-500">
              File uploaded: {file.name}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => navigate('/status')}>Check Status</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Submit a print job request</CardTitle>
        <CardDescription>
          Fill out the form below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              required
              placeholder="Jane Doe"
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="jane@vt.edu"
              value={form.studentEmail}
              onChange={(e) => setForm({ ...form, studentEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions..."
              value={form.studentNotes}
              onChange={(e) => setForm({ ...form, studentNotes: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-6 text-sm text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">{file.name}</span>
                    <span className="text-xs text-neutral-400">({file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile() }}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-8 w-8 text-neutral-400" />
                  <p>Click to upload a file</p>
                  <p className="text-xs">{acceptString} — max {MAX_FILE_SIZE_MB} MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptString}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            {fileError && (
              <p className="text-sm text-red-600">{fileError}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Job Request
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
