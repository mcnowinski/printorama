import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { record } = await req.json()
    if (!record || !record.job_id) {
      return new Response(JSON.stringify({ error: 'Missing job_id in payload' }), { status: 200, headers })
    }

    if (record.field !== 'status') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a status change' }), { status: 200, headers })
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('title, student_name, student_email')
      .eq('id', record.job_id)
      .single()

    if (jobError || !job) {
      console.error('Job lookup failed:', jobError?.message)
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 200, headers })
    }

    const { data: settings } = await supabase
      .from('system_settings')
      .select('email_subject_prefix, site_url')
      .single()

    const prefix = settings?.email_subject_prefix || '[Fab-O-Rama]'
    const siteUrl = settings?.site_url || ''

    const subject = `${prefix} ${'"' + job.title + '"'} : ${record.new_value}`
    const statusLink = siteUrl ? `${siteUrl}/status/${record.job_id}?email=${encodeURIComponent(job.student_email)}` : ''

    const emailBody = [
      `Hi ${job.student_name}!`,
      ' ',
      `The status of your job ${'("' + job.title + '")'} has been changed to ${record.new_value}.` + (statusLink ? `Additional details can be found at ${statusLink}.` : ''),
      ' ',
      'Thanks,',
      prefix.replace(/[\[\]]/g, ''),
    ].filter(Boolean).join('\n')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.log('[EMAIL MOCK] Would send:')
      console.log(`  To: ${job.student_email}`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Body:\n${emailBody}`)
      return new Response(JSON.stringify({ sent: false, mock: true }), { status: 200, headers })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${prefix.replace(/[\[\]]/g, '')} <onboarding@resend.dev>`,
        to: [job.student_email],
        subject,
        text: emailBody,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: err }), { status: 200, headers })
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers })

  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 200,
      headers,
    })
  }
})
