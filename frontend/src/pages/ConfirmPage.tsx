import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function ConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing confirmation token.')
      return
    }

    supabase
      .from('jobs')
      .select('id, status, student_email, title')
      .eq('confirmation_token', token)
      .single()
      .then(({ data: job, error: findError }) => {
        if (findError || !job) {
          setStatus('error')
          setMessage('Invalid or expired confirmation link.')
          return
        }

        if (job.status !== 'AWAITING_CONFIRMATION') {
          setStatus('success')
          setMessage(`Your job "${job.title}" has already been confirmed.`)
          return
        }

        supabase
          .from('jobs')
          .update({
            status: 'RECEIVED',
            confirmation_token: null,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', job.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              setStatus('error')
              setMessage('Something went wrong. Please try again.')
              return
            }
            setStatus('success')
            setMessage(`Your job "${job.title}" has been confirmed! We'll send updates to ${job.student_email}.`)
          })
      })
  }, [token])

  return (
    <div className="flex items-center justify-center py-24">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
              <CardTitle>Confirming your job...</CardTitle>
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <CardTitle>Job Confirmed!</CardTitle>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <CardTitle>Confirmation Failed</CardTitle>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-neutral-600">{message}</p>
          <Link to="/status">
            <Button variant="outline">Check Your Jobs</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
