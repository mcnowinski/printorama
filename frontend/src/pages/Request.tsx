import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Request() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [jobLink, setJobLink] = useState('')
  const [requestsOpen, setRequestsOpen] = useState(true)

  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false)

  const [form, setForm] = useState({
    title: '',
    studentName: '',
    studentEmail: '',
    studentNotes: '',
    filamentType: '',
    filamentColor: '',
  })

  useEffect(() => {
    supabase.from('system_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setRequestsOpen(data.requests_open)
        setEmailConfirmationRequired(data.email_confirmation_required)
      }
    })

  }, [])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const confirmationToken = emailConfirmationRequired
      ? crypto.randomUUID()
      : null

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        title: form.title,
        student_name: form.studentName,
        student_email: form.studentEmail,
        student_notes: form.studentNotes || null,
        filament_type: form.filamentType || null,
        filament_color: form.filamentColor || null,
        status: emailConfirmationRequired ? 'AWAITING_CONFIRMATION' : 'RECEIVED',
        confirmation_token: confirmationToken,
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (emailConfirmationRequired && confirmationToken) {
      const link = `${window.location.origin}/confirm?token=${confirmationToken}`
      await supabase.from('notifications').insert({
        job_id: job.id,
        recipient: form.studentEmail,
        type: 'CONFIRMATION',
        message: `Confirm your print job: ${link}`,
      })
      setJobLink(link)
    } else {
      setJobLink(`${window.location.origin}/status/${job.id}`)
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg mt-12">
        <CardHeader>
          <CardTitle>Job Submitted!</CardTitle>
          <CardDescription>
            Your print job has been {emailConfirmationRequired ? 'registered' : 'submitted'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailConfirmationRequired ? (
            <p className="text-sm text-neutral-600">
              Check your email at <strong>{form.studentEmail}</strong> for a confirmation link.
              Your job won't be queued until you confirm.
            </p>
          ) : (
            <p className="text-sm text-neutral-600">
              Your job link: <a href={jobLink} className="text-blue-600 underline">{jobLink}</a>
            </p>
          )}
          <p className="text-sm text-neutral-500">
            A confirmation email has been sent to <strong>{form.studentEmail}</strong>.
          </p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
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
          {/* <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              required
              placeholder="My 3D Print"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div> */}
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
          {/* <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filament">Filament Type</Label>
              <Select
                id="filament"
                value={form.filamentType}
                onChange={(e) => setForm({ ...form, filamentType: e.target.value })}
              >
                <option value="">Any</option>
                {filamentTypes.map((t) => (
                  <option key={t.label} value={t.label}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Filament Color</Label>
              <Select
                id="color"
                value={form.filamentColor}
                onChange={(e) => setForm({ ...form, filamentColor: e.target.value })}
              >
                <option value="">Any</option>
                {filamentColors.map((c) => (
                  <option key={c.label} value={c.label}>{c.label}</option>
                ))}
              </Select>
            </div>
          </div> */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions..."
              value={form.studentNotes}
              onChange={(e) => setForm({ ...form, studentNotes: e.target.value })}
            />
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
