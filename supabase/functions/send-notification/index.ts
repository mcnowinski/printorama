import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { jobId, recipient, type, message } = await req.json()

  console.log(`[MOCK EMAIL] To: ${recipient}, Type: ${type}`)
  console.log(`[MOCK EMAIL] Message: ${message}`)
  console.log(`[MOCK EMAIL] Job ID: ${jobId}`)

  const { error } = await supabase
    .from('notifications')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) {
    console.error('Failed to mark notification as sent:', error)
    return new Response(error.message, { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, sent: false, mock: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
