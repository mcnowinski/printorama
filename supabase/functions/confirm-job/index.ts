import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: job, error: findError } = await supabase
    .from('jobs')
    .select('id, status, student_email')
    .eq('confirmation_token', token)
    .single()

  if (findError || !job) {
    return new Response('Invalid or expired confirmation link', { status: 404 })
  }

  if (job.status !== 'AWAITING_CONFIRMATION') {
    return new Response('Job already confirmed', { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      status: 'RECEIVED',
      confirmation_token: null,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  if (updateError) {
    return new Response(updateError.message, { status: 500 })
  }

  return new Response(
    `<html><body><h1>Job confirmed!</h1><p>Your print job has been submitted. You'll receive updates via email.</p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
})
