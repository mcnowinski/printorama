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
    if (!record || !record.student_email) {
      return new Response(JSON.stringify({ error: 'Missing student_email in payload' }), { status: 200, headers })
    }

    const { data: settings } = await supabase
      .from('system_settings')
      .select('email_subject_prefix, site_url')
      .single()

    const prefix = settings?.email_subject_prefix || '[Fab-O-Rama]'
    const siteUrl = settings?.site_url || ''
    const senderName = prefix.replace(/[\[\]]/g, '') 

    const subject = `${prefix} ${'"' + record.title + '"' || 'Job Request'} : RECEIVED`
    const statusLink = siteUrl ? `${siteUrl}/status` : ''

    const emailBody = [
      `Hi ${record.student_name}!`,
      ' ',
      `Your job ${record.title ? '("' + record.title + '")' : '"Job Request"'} has been RECEIVED and will be reviewed shortly. Job status changes will be automatically emailed to you` + (statusLink ? ` or can be checked directly at ${statusLink}.` : '.'),
      ' ',
      'Thanks,',
      senderName,
    ].filter(Boolean).join('\n')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.log('[EMAIL MOCK] Queue confirmation:')
      console.log(`  To: ${record.student_email}`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Body:\n${emailBody}`)
      return new Response(JSON.stringify({ sent: false, mock: true }), { status: 200, headers })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${senderName} <onboarding@resend.dev>`,
        to: [record.student_email],
        subject,
        text: emailBody
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
